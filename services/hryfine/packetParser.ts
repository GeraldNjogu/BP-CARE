import { Buffer } from "buffer";
import { DF_SUBCMD } from "./constants";

export type ParsedFdFrame = {
  kind: "fd";
  opcode: number;
  params: [number, number, number, number];
  raw: Buffer;
};

export type ParsedDfFrame = {
  kind: "df";
  payloadLength: number;
  checksum: number;
  sequence: number;
  subCommand: number;
  payload: Buffer;
  raw: Buffer;
};

export type ParsedFrame = ParsedFdFrame | ParsedDfFrame;

const DF_MAGIC = 0xdf;
const FD_MAGIC = 0xfd;

/** HR decode offsets confirmed across logs C & D. */
const HR_OFFSET_A = 85; // Log C: 0xAD - 85 = 88
const HR_OFFSET_B = 98; // Log D: 0xB1 - 98 = 79
const HR_BYTE8_OFFSET = 8; // Log D HR: payload[8] + 8 = 79 (0x47 + 8)

const isDfHeader = (buf: Buffer) =>
  buf.length >= 9 && buf[0] === DF_MAGIC && buf[1] === 0x00;

const isFdFrame = (buf: Buffer) =>
  buf.length === 9 && buf[0] === FD_MAGIC && buf[1] === 0x00 && buf[2] === 0x05;

const isProtocolChunk = (buf: Buffer) => isFdFrame(buf) || isDfHeader(buf);

/** Total bytes in a DF frame: 4-byte prefix + length field at index 2. */
export function getDfFrameLength(header: Buffer): number {
  if (!isDfHeader(header)) {
    return 0;
  }
  return 4 + header[2];
}

/** Parse a single 20-byte (or shorter) BLE notification chunk. */
export function parseNotificationChunk(chunk: Buffer): ParsedFrame | null {
  if (isFdFrame(chunk)) {
    return {
      kind: "fd",
      opcode: chunk[3],
      params: [chunk[4], chunk[5], chunk[6], chunk[7]],
      raw: chunk,
    };
  }

  if (isDfHeader(chunk)) {
    const payloadLength = chunk[2];
    const checksum = (chunk[3] << 8) | chunk[4];
    const sequence = chunk[5];
    const subCommand = chunk[6];
    const frameLength = getDfFrameLength(chunk);
    const payload = chunk.slice(8, Math.min(chunk.length, frameLength));

    return {
      kind: "df",
      payloadLength,
      checksum,
      sequence,
      subCommand,
      payload,
      raw: chunk.slice(0, Math.min(chunk.length, frameLength)),
    };
  }

  return null;
}

/**
 * Reassemble fragmented DF frames sent as consecutive BLE notifications.
 * Length byte at index 2 defines total frame size as (4 + length).
 */
export class DfFrameReassembler {
  private chunks: Buffer[] = [];

  push(chunk: Buffer): ParsedDfFrame | null {
    if (isProtocolChunk(chunk)) {
      if (isDfHeader(chunk)) {
        this.chunks = [chunk];
      } else {
        this.reset();
        return null;
      }
    } else if (this.chunks.length > 0) {
      this.chunks.push(chunk);
    } else {
      return null;
    }

    return this.tryComplete();
  }

  reset() {
    this.chunks = [];
  }

  private tryComplete(): ParsedDfFrame | null {
    const combined = Buffer.concat(this.chunks);
    if (combined.length < 9 || !isDfHeader(combined)) {
      return null;
    }

    const frameLength = getDfFrameLength(combined);
    if (combined.length < frameLength) {
      return null;
    }

    const frame = combined.slice(0, frameLength);
    this.reset();

    const checksum = (frame[3] << 8) | frame[4];
    const sequence = frame[5];
    const subCommand = frame[6];
    const payload = frame.slice(8, frameLength);

    return {
      kind: "df",
      payloadLength: frame[2],
      checksum,
      sequence,
      subCommand,
      payload,
      raw: frame,
    };
  }
}

export type VitalMeasurement = {
  systolic: number;
  diastolic: number;
  heartRate: number;
};

const validBp = (sys: number, dia: number) =>
  sys >= 70 &&
  sys <= 250 &&
  dia >= 40 &&
  dia <= 160 &&
  dia < sys;

const validHr = (hr: number) => hr >= 30 && hr <= 220;

export function decodeHeartRateFromPayload(payload: Buffer): number | null {
  if (payload.length < 8) {
    return null;
  }

  const candidates: number[] = [];
  const byte7 = payload[7];
  const byte8 = payload.length >= 9 ? payload[8] : 0;

  if (payload.length >= 9 && byte8 >= 0x47) {
    candidates.push(byte8 + HR_BYTE8_OFFSET);
  } else if (byte8 >= 0x30) {
    candidates.push(byte7 - HR_OFFSET_A, byte7 - HR_OFFSET_B);
  } else {
    candidates.push(byte7 - HR_OFFSET_B, byte7 - HR_OFFSET_A);
  }

  for (const heartRate of candidates) {
    if (validHr(heartRate)) {
      return heartRate;
    }
  }

  return null;
}

/**
 * Decode vitals from a reassembled DF frame.
 *
 * Log B (110/75): subcmd 0x05 → systolic = penultimate byte, diastolic = last byte.
 * Log C (88 bpm): subcmd 0x04 → HR = payload[7] - 85.
 * Log D (117/80, 79 bpm): subcmd 0x05 → 0x75/0x52; HR = payload[7] - 98 or payload[8] + 8.
 * Live stream: subcmd 0x09 → payload[6] while measuring.
 */
export function tryParseVitalFromDfFrame(frame: ParsedDfFrame): VitalMeasurement | null {
  const data = frame.raw;

  if (frame.subCommand === DF_SUBCMD.BP_RESULT && data.length >= 2) {
    const systolic = data[data.length - 2];
    const diastolic = data[data.length - 1];
    if (!validBp(systolic, diastolic)) {
      return null;
    }
    const heartRate = decodeHeartRateFromPayload(frame.payload) ?? 0;

    return {
      systolic,
      diastolic,
      heartRate: heartRate || 70,
    };
  }

  if (frame.subCommand === DF_SUBCMD.HR_RESULT && frame.payload.length >= 8) {
    const heartRate = decodeHeartRateFromPayload(frame.payload);
    if (!heartRate) {
      return null;
    }
    return {
      systolic: 0,
      diastolic: 0,
      heartRate,
    };
  }

  if (frame.subCommand === DF_SUBCMD.HEALTH_STREAM && frame.payload.length >= 7) {
    const heartRate = frame.payload[6];
    if (validHr(heartRate) && frame.payload[3] === 0x00 && frame.payload[4] === 0x00) {
      return {
        systolic: 0,
        diastolic: 0,
        heartRate,
      };
    }
  }

  return null;
}

export function isBpResultFrame(frame: ParsedDfFrame): boolean {
  return (
    frame.subCommand === DF_SUBCMD.BP_RESULT &&
    frame.payload.length >= 5 &&
    frame.payload[4] === 0x01
  );
}

export function isHrResultFrame(frame: ParsedDfFrame): boolean {
  return (
    frame.subCommand === DF_SUBCMD.HR_RESULT &&
    frame.payload.length >= 8 &&
    frame.payload[4] === 0x01
  );
}

export function isBpMeasurementStarted(frame: ParsedDfFrame): boolean {
  return frame.subCommand === DF_SUBCMD.BP_MEASURE;
}

/** Convert nRF log hex string "DF-00-05-04-F0" to Buffer. */
export function hexLogToBuffer(hex: string): Buffer {
  const cleaned = hex.replace(/\(0x\)\s*/gi, "").replace(/[^0-9a-f]/gi, "");
  return Buffer.from(cleaned, "hex");
}
