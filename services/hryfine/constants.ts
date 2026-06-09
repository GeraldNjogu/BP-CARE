/** Hryfine / MOYOUNG-family watch BLE identifiers (from nRF Connect capture). */

export const HRYFINE_DEVICE_NAME_PATTERN = /^watch$/i;

export const HRYFINE_MAC_PREFIX = "DA:F3:EB"; // optional hint; MAC varies per unit

export const GATT = {
  BATTERY_SERVICE: "0000180f-0000-1000-8000-00805f9b34fb",
  BATTERY_LEVEL: "00002a19-0000-1000-8000-00805f9b34fb",
  DEVICE_INFO: "0000180a-0000-1000-8000-00805f9b34fb",

  NUS_SERVICE: "6e400001-b5a3-f393-e0a9-e50e24dcca9f",
  NUS_RX: "6e400002-b5a3-f393-e0a9-e50e24dcca9f",
  NUS_TX: "6e400003-b5a3-f393-e0a9-e50e24dcca9f",

  FF00_SERVICE: "0000ff00-0000-1000-8000-00805f9b34fb",
  FF01_NOTIFY: "0000ff01-0000-1000-8000-00805f9b34fb",
  FF02_WRITE: "0000ff02-0000-1000-8000-00805f9b34fb",

  FF10_SERVICE: "0000ff10-0000-1000-8000-00805f9b34fb",
  FFF1_RW: "0000fff1-0000-1000-8000-00805f9b34fb",

  FF12_SERVICE: "0000ff12-0000-1000-8000-00805f9b34fb",
  FF13_WRITE: "0000ff13-0000-1000-8000-00805f9b34fb",
  FF14_NOTIFY: "0000ff14-0000-1000-8000-00805f9b34fb",

  CCCD: "00002902-0000-1000-8000-00805f9b34fb",
} as const;

/** DF frame sub-commands (confirmed from Logs A–C). */
export const DF_SUBCMD = {
  BIND_HANDSHAKE: 0x07,
  DEVICE_INFO: 0x08,
  HEALTH_STREAM: 0x09,
  SYNC_BLOCK: 0x02,
  /** Final heart rate result (HR = payload[7] - 85). */
  HR_RESULT: 0x04,
  /** Final blood pressure result (sys = penultimate byte, dia = last byte). */
  BP_RESULT: 0x05,
  /** Watch ack when measurement begins (notification from watch). */
  BP_MEASURE: 0x0c,
  /** Phone command to start measurement (HCI frame 54739). */
  START_MEASURE: 0x06,
} as const;

/** FD frame opcodes (byte 3 of 9-byte phone→watch packets). */
export const FD_OPCODE = {
  PAIRING_START: 0x04,
  SESSION_READY: 0x17,
  DATA_REQUEST: 0x19,
  SESSION_SYNC: 0x14,
} as const;
