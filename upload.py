import logging
import os
import threading
import time
from pathlib import Path
from typing import Any

import serial
from dotenv import load_dotenv
from supabase import create_client


PORT = "/dev/cu.usbmodem2101"
BAUD_RATE = 115200
SAVE_INTERVAL_SECONDS = 1.0
SERIAL_TIMEOUT_SECONDS = 0.25

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("sensor_uploader")


def read_sensor(
    arduino: serial.Serial,
    latest_reading: dict[str, int | None],
    reading_lock: threading.Lock,
    stop_event: threading.Event,
) -> None:
    while not stop_event.is_set():
        try:
            raw_line = arduino.readline()
        except serial.SerialException:
            logger.exception("Serial read failed on %s", PORT)
            stop_event.set()
            return

        if not raw_line:
            continue

        logger.info("RAW: %r", raw_line)
        try:
            decoded_line = raw_line.decode("ascii").strip()
            value = int(decoded_line)
        except (UnicodeDecodeError, ValueError):
            logger.warning("Could not parse serial line: %r", raw_line)
            continue

        logger.info("PARSED: %d", value)
        if not 0 <= value <= 1023:
            logger.warning("Ignoring out-of-range sensor value: %d", value)
            continue

        with reading_lock:
            latest_reading["value"] = value


def save_latest_reading(client: Any, value: int) -> None:
    payload = {"value": float(value)}
    logger.info("SAVED (INSERT value): %r", payload["value"])
    try:
        client.table("readings").insert(payload).execute()
    except Exception:
        logger.exception("Supabase insert failed for payload: %r", payload)
        return

    logger.info("Supabase insert succeeded: value=%r", payload["value"])


def main() -> None:
    load_dotenv(Path(__file__).with_name(".env"))

    supabase_url = os.getenv("VITE_SUPABASE_URL")
    supabase_key = os.getenv("VITE_SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_key:
        raise ValueError(
            "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env"
        )

    client = create_client(supabase_url, supabase_key)
    latest_reading: dict[str, int | None] = {"value": None}
    reading_lock = threading.Lock()
    stop_event = threading.Event()

    logger.info("Connecting to Arduino on %s at %d baud", PORT, BAUD_RATE)
    with serial.Serial(PORT, BAUD_RATE, timeout=SERIAL_TIMEOUT_SECONDS) as arduino:
        logger.info("Connected to Arduino. Press Ctrl+C to stop.")
        reader_thread = threading.Thread(
            target=read_sensor,
            args=(arduino, latest_reading, reading_lock, stop_event),
            name="serial-reader",
            daemon=True,
        )
        reader_thread.start()

        next_save_at = time.monotonic() + SAVE_INTERVAL_SECONDS
        while not stop_event.is_set():
            wait_seconds = max(0.0, next_save_at - time.monotonic())
            if stop_event.wait(wait_seconds):
                break

            with reading_lock:
                value = latest_reading["value"]

            if value is None:
                logger.warning("No valid sensor reading received; skipping this interval")
            else:
                save_latest_reading(client, value)

            next_save_at = time.monotonic() + SAVE_INTERVAL_SECONDS

        stop_event.set()
        reader_thread.join(timeout=1.0)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("Stopped by user.")
    except (serial.SerialException, OSError, ValueError):
        logger.exception("Uploader stopped because of a configuration or connection error")
    except Exception:
        logger.exception("Uploader stopped because of an unexpected error")