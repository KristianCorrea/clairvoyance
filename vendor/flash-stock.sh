#!/usr/bin/env bash
# Restore ELEGOO Camera-V1.5 stock AP firmware (channel 9 binary).
# Run from anywhere; resolves paths relative to this script.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BIN="$ROOT/elegoo-wrover-stock/ESP32_CameraServer_AP_20220120.ino.bin"
PIO_BIN="${HOME}/.platformio/penv/bin"
ESPTOOL="${HOME}/.platformio/packages/tool-esptoolpy/esptool.py"
PYTHON="${PIO_BIN}/python"

export PATH="${PIO_BIN}:${PATH}"

if [[ ! -f "$BIN" ]]; then
  echo "Missing binary: $BIN" >&2
  exit 1
fi
if [[ ! -x "$PYTHON" ]]; then
  echo "PlatformIO Python not found at $PYTHON — install PlatformIO Core first." >&2
  exit 1
fi
if [[ ! -f "$ESPTOOL" ]]; then
  echo "esptool not found at $ESPTOOL — run 'pio pkg install' / build any esp32 project once." >&2
  exit 1
fi

PORT="${1:-}"
if [[ -z "$PORT" ]]; then
  PORT="$(pio device list | awk '/ttyUSB/{print $1; exit}')"
fi
if [[ -z "$PORT" ]]; then
  echo "No /dev/ttyUSB* found. Plug in the board (and check dialout permissions)." >&2
  exit 1
fi

echo "Flashing stock firmware to $PORT ..."
"$PYTHON" "$ESPTOOL" \
  --chip esp32 --port "$PORT" --baud 460800 \
  write_flash -z 0x10000 "$BIN"

echo
echo "Done. Monitor with:  pio device monitor -b 9600 --port $PORT"
echo "Then join ELEGOO-… Wi-Fi and open http://192.168.4.1"
