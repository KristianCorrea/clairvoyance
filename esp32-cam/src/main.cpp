/**
 * CameraWebServer — stream video from an ESP32-WROVER Camera to your PC
 *
 * What this program does (high level):
 *   1. Starts the serial console so you can see status messages on your PC
 *   2. Initializes the OV camera using the WROVER-KIT pin map
 *   3. Connects to your Wi-Fi router (station / client mode)
 *   4. Starts an HTTP server that serves a control page + MJPEG stream
 *
 * After upload, open Serial Monitor, copy the printed http://IP address,
 * open it in a browser on the same Wi-Fi, then click "Start Stream".
 *
 * Direct stream URL (VLC / OpenCV):  http://<ip>:81/stream
 *
 * Based on Espressif's Arduino-ESP32 CameraWebServer example (Apache 2.0).
 */

#include "esp_camera.h"
#include <WiFi.h>

// ---------------------------------------------------------------------------
// Board / pin map
// ---------------------------------------------------------------------------
// ELEGOO ESP32-WROVER Camera-V1.5 stock firmware uses M5STACK_WIDE pins
// (NOT CAMERA_MODEL_WROVER_KIT). Using WROVER_KIT causes probe error 0x105.
#define CAMERA_MODEL_M5STACK_WIDE
#include "camera_pins.h"
#include "wifi_secrets.h"

// Implemented in app_httpd.cpp (HTTP UI + /stream handler)
void startCameraServer();
void setupLedFlash(int pin);

// ---------------------------------------------------------------------------
// setup() runs once after the ESP32 boots or resets
// ---------------------------------------------------------------------------
void setup() {
  // USB serial: matches monitor_speed in platformio.ini
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println();
  Serial.println("=== ESP32-WROVER CameraWebServer ===");

  // ---- Camera driver configuration ----------------------------------------
  // camera_config_t tells the esp_camera driver which GPIOs talk to the
  // sensor, what image format to use, and how to buffer frames in memory.
  // Zero-init first so newer fields (sccb_i2c_port, etc.) are not garbage.
  camera_config_t config = {};
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;

  // 8 parallel data pins (Y2..Y9) carry one pixel byte at a time from the sensor
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;

  // Timing / control pins
  config.pin_xclk = XCLK_GPIO_NUM;    // clock the ESP32 outputs to the sensor
  config.pin_pclk = PCLK_GPIO_NUM;    // pixel clock from the sensor
  config.pin_vsync = VSYNC_GPIO_NUM;  // start of a new frame
  config.pin_href = HREF_GPIO_NUM;    // valid line of pixels

  // SCCB is the camera's I2C-like control bus (set resolution, flip, etc.)
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  // Some boards fail probe on the default I2C port; force port 0.
  config.sccb_i2c_port = 0;

  // WROVER-KIT wiring: no separate power-down / reset GPIO (-1 = unused)
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;

  // Freenove / many WROVER CAM demos use 10 MHz (20 MHz can fail probe on some modules)
  config.xclk_freq_hz = 10000000;
  config.frame_size = FRAMESIZE_UXGA;      // max capture size if PSRAM allows
  config.pixel_format = PIXFORMAT_JPEG;    // JPEG = good for network streaming
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location = CAMERA_FB_IN_PSRAM; // store frames in external PSRAM
  config.jpeg_quality = 12;                // lower number = higher quality
  config.fb_count = 1;                     // number of frame buffers

  // PSRAM (extra RAM on WROVER modules) lets us use larger frames / dual buffers
  if (config.pixel_format == PIXFORMAT_JPEG) {
    if (psramFound()) {
      Serial.println("PSRAM found — using dual frame buffers");
      config.jpeg_quality = 10;
      config.fb_count = 2;
      config.grab_mode = CAMERA_GRAB_LATEST;
    } else {
      Serial.println("WARNING: no PSRAM — lowering resolution");
      config.frame_size = FRAMESIZE_SVGA;
      config.fb_location = CAMERA_FB_IN_DRAM;
    }
  } else {
    // RGB path used mainly for on-device face detection demos
    config.frame_size = FRAMESIZE_240X240;
  }

  // ---- Start the camera hardware ------------------------------------------
  delay(200);  // give the OV sensor a moment after power/clock settle
  Serial.println("Probing camera (10 MHz XCLK, SCCB port 0)...");
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    Serial.println("Check: USB power, ribbon, CAMERA_MODEL_M5STACK_WIDE (ELEGOO stock pins)");
    return;  // cannot continue without a working camera
  }
  Serial.println("Camera initialized");

  // Optional sensor tweaks (some modules ship upside-down / oversaturated)
  sensor_t *s = esp_camera_sensor_get();
  if (s->id.PID == OV3660_PID) {
    s->set_vflip(s, 1);
    s->set_brightness(s, 1);
    s->set_saturation(s, -2);
  }

  // Start at QVGA (320x240) for a snappier first stream; change in the web UI
  if (config.pixel_format == PIXFORMAT_JPEG) {
    s->set_framesize(s, FRAMESIZE_QVGA);
  }

  // Some boards define an LED flash pin in camera_pins.h (WROVER-KIT usually does not)
#if defined(LED_GPIO_NUM)
  setupLedFlash(LED_GPIO_NUM);
#endif

  // ---- Join your Wi-Fi network --------------------------------------------
  Serial.printf("Connecting to Wi-Fi SSID: %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  WiFi.setSleep(false);  // disable modem sleep so the stream stays responsive

  // Wait up to ~30 seconds (60 * 500 ms). If this loops forever in older
  // firmware, the SSID/password were wrong — same idea here, but we time out.
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 60) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi FAILED. Edit include/wifi_secrets.h and re-upload.");
    Serial.println("Reminder: ESP32 needs a 2.4 GHz network (not 5 GHz only).");
    return;
  }

  Serial.println("Wi-Fi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  // ---- Start HTTP servers (control page on :80, stream on :81) ------------
  startCameraServer();

  Serial.println();
  Serial.print("Camera Ready! Open http://");
  Serial.print(WiFi.localIP());
  Serial.println("/ in a browser, then click Start Stream");
  Serial.print("Direct MJPEG stream: http://");
  Serial.print(WiFi.localIP());
  Serial.println(":81/stream");
}

// ---------------------------------------------------------------------------
// loop() runs forever after setup(). Streaming work happens in other tasks
// created by startCameraServer(), so we just idle here.
// ---------------------------------------------------------------------------
void loop() {
  delay(10000);
}
