import { Buffer } from "buffer";

/**
 * Captured from Hryfine HCI snoop (handle 0x001c / NUS RX).
 * Frame 54739: measurement start. Frame 46337: session sync ack.
 */

/** Start BP or HR measurement (Hryfine frame 54739). DF subcmd 0x06. */
export const START_MEASUREMENT = Buffer.from("df000602051006000101", "hex");

export const START_BP_MEASUREMENT = START_MEASUREMENT;
export const START_HR_MEASUREMENT = START_MEASUREMENT;

/** Bind confirm after watch handshake (Logs A/B). */
export const BIND_CONFIRM = Buffer.from("df0006f5050107000101", "hex");

/** Session sync ack during active connection (Hryfine frame 46337). */
export const SESSION_SYNC_ACK = Buffer.from("fd000514050c000001", "hex");
