# ESP32-WROVER CameraWebServer

Stream live video from an **ESP32-WROVER Camera-v1.5** to your PC over Wi‑Fi using PlatformIO (no Arduino IDE required).

```text
Camera → ESP32 firmware → your Wi‑Fi router → browser / VLC / OpenCV on PC
```

## What you need

- ESP32-WROVER Camera board + a **data-capable** USB cable
- PC on the **same 2.4 GHz Wi‑Fi** as the board (ESP32 cannot use 5 GHz-only networks)
- [PlatformIO Core](https://docs.platformio.org/en/latest/core/installation/methods/installer-script.html) (`pio` on your PATH)

## Project layout

```text
esp32-cam/
├── platformio.ini          # board, build, and upload settings
├── README.md               # this file
├── include/
│   ├── wifi_secrets.h      # ← put your Wi‑Fi SSID/password here
│   ├── camera_pins.h       # GPIO map (WROVER-KIT pins)
│   └── camera_index.h      # embedded web UI (generated HTML/JS)
└── src/
    ├── main.cpp            # setup: camera + Wi‑Fi + start server
    └── app_httpd.cpp       # HTTP handlers (/ and /stream)
```

## One-time setup

### 1. Install PlatformIO Core (if you have not already)

```bash
curl -fsSL -o get-platformio.py https://raw.githubusercontent.com/platformio/platformio-core-installer/master/get-platformio.py
python3 get-platformio.py
echo 'export PATH="$PATH:$HOME/.platformio/penv/bin"' >> ~/.bashrc
source ~/.bashrc
pio --version
```

### 2. Allow your user to use the USB serial port (Linux)

```bash
sudo usermod -aG dialout $USER
# log out and back in, then:
ls -l /dev/ttyUSB0   # or /dev/ttyACM0
```

If `pio run` fails with `Permission denied` under `~/.platformio`, fix ownership once:

```bash
sudo chown -R "$USER:$USER" "$HOME/.platformio"
```

### 3. Enter Wi‑Fi credentials

Edit [`include/wifi_secrets.h`](include/wifi_secrets.h):

```c
#define WIFI_SSID "YourNetworkName"
#define WIFI_PASSWORD "YourPassword"
```

Use a **2.4 GHz** SSID. Save the file.

## Build, flash, and watch logs

Plug the board in over USB, then from **this** directory:

```bash
cd esp32-cam

# Compile firmware (downloads ESP32 toolchain on first run — can take a while)
pio run

# Flash to the board over USB
pio run -t upload

# Read status messages (IP address, errors)
pio device monitor -b 115200
```

Press the board **RST** button if the monitor was already open before boot.

You want to see something like:

```text
Wi-Fi connected
IP address: 192.168.1.42
Camera Ready! Open http://192.168.1.42/ in a browser...
```

Quit the monitor with `Ctrl+C`.

## View the stream

1. On your PC (same Wi‑Fi), open the printed URL, e.g. `http://192.168.1.42/`
2. Click **Start Stream** at the bottom of the page

Direct MJPEG URL (handy for VLC or OpenCV):

```text
http://<board-ip>:81/stream
```

Example with OpenCV (Python):

```python
import cv2
cap = cv2.VideoCapture("http://192.168.1.42:81/stream")
while True:
    ok, frame = cap.read()
    if not ok:
        break
    cv2.imshow("ESP32", frame)
    if cv2.waitKey(1) == 27:
        break
```

## Commands cheat sheet

| Goal | Command |
|------|---------|
| Compile only | `pio run` |
| Compile + flash | `pio run -t upload` |
| Serial console | `pio device monitor -b 115200` |
| List serial ports | `pio device list` |

## Troubleshooting

| Symptom | What to try |
|---------|-------------|
| `Permission denied: '/dev/ttyUSB0'` | Add yourself to `dialout`, log out/in; or install PlatformIO udev rules |
| Endless `WiFi connecting...` / Wi‑Fi FAILED | Fix `wifi_secrets.h`; confirm 2.4 GHz; avoid guest/AP-isolation networks |
| `Camera init failed` / `0x105` | ELEGOO Camera-V1.5 needs `CAMERA_MODEL_M5STACK_WIDE` (stock firmware), **not** `WROVER_KIT`. See `../vendor/README.md` |
| Upload fails / brownout | Use a data + power capable cable; powered USB hub; lower `upload_speed` in `platformio.ini` |
| Page loads, no video | Click **Start Stream**; try `http://IP:81/stream` |
| Wrong serial port | `pio device list`, then set `upload_port` / `monitor_port` in `platformio.ini` |

## How the pieces fit together

1. **`main.cpp`** boots the camera and joins Wi‑Fi, then calls `startCameraServer()`.
2. **`app_httpd.cpp`** runs two small web servers:
   - port **80** — settings page
   - port **81** — live JPEG stream (`multipart/x-mixed-replace`)
3. Your browser repeatedly receives JPEG frames and displays them as video (MJPEG). This is simple and local-LAN friendly; it is not H.264/WebRTC.

## Credits

Camera web server logic and UI come from Espressif’s [Arduino-ESP32 CameraWebServer](https://github.com/espressif/arduino-esp32/tree/master/libraries/ESP32/examples/Camera/CameraWebServer) example (Apache License 2.0).
