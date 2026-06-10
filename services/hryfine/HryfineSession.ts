import { Buffer } from "buffer";
import type { Device, Subscription } from "react-native-ble-plx";
import { GATT } from "./constants";
import {
  DfFrameReassembler,
  isBpMeasurementStarted,
  isBpResultFrame,
  isHrResultFrame,
  parseNotificationChunk,
  tryParseVitalFromDfFrame,
  type ParsedDfFrame,
  type ParsedFdFrame,
  type VitalMeasurement,
} from "./packetParser";
import {
  BIND_CONFIRM,
  SESSION_SYNC_ACK,
  START_BP_MEASUREMENT,
  START_HR_MEASUREMENT,
} from "./commands";

export type MeasurementMode = "bp" | "hr" | "auto";

export type HryfineSessionOptions = {
  onVital?: (reading: VitalMeasurement) => void;
  onBpStarted?: () => void;
  onLog?: (message: string, data?: Record<string, unknown>) => void;
};

const toBase64 = (buf: Buffer) => buf.toString("base64");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** FD opcodes from the watch that Hryfine answers with SESSION_SYNC_ACK. */
const FD_ACK_OPCODES = new Set([0x04, 0x12, 0x14, 0x17, 0x18, 0x19, 0x1c, 0x1d]);

export class HryfineSession {
  private device: Device;
  private reassembler = new DfFrameReassembler();
  private subscriptions: Subscription[] = [];
  private options: HryfineSessionOptions;
  private lastHeartRate = 0;
  private lastFdAckAt = 0;
  private measureStartedResolve: (() => void) | null = null;

  constructor(device: Device, options: HryfineSessionOptions = {}) {
    this.device = device;
    this.options = options;
  }

  private log(message: string, data?: Record<string, unknown>) {
    this.options.onLog?.(message, data);
  }

  async setup(): Promise<void> {
    await this.device.discoverAllServicesAndCharacteristics();
    this.log("Hryfine services discovered");

    await this.enableNotifications(GATT.NUS_TX);
    await this.enableNotifications(GATT.FF01_NOTIFY);
    await this.enableNotifications(GATT.FF14_NOTIFY);

    await Promise.all([
      this.monitorCharacteristic(GATT.NUS_SERVICE, GATT.NUS_TX),
      this.monitorCharacteristic(GATT.FF00_SERVICE, GATT.FF01_NOTIFY),
      this.monitorCharacteristic(GATT.FF12_SERVICE, GATT.FF14_NOTIFY),
    ]);

    this.log("Hryfine session ready", {
      monitored: [GATT.NUS_TX, GATT.FF01_NOTIFY, GATT.FF14_NOTIFY],
    });
  }

  private async enableNotifications(characteristicUuid: string) {
    this.log("enableNotifications", { characteristicUuid });
    const services = await this.device.services();
    for (const service of services) {
      const characteristics = await service.characteristics();
      for (const characteristic of characteristics) {
        if (characteristic.uuid.toLowerCase() !== characteristicUuid.toLowerCase()) {
          continue;
        }
        if (!characteristic.isNotifiable) {
          continue;
        }
        try {
          await this.device.writeDescriptorForService(
            service.uuid,
            characteristicUuid,
            GATT.CCCD,
            toBase64(Buffer.from([0x01, 0x00]))
          );
          this.log("enabledNotification", {
            service: service.uuid,
            characteristic: characteristicUuid,
          });
        } catch (err) {
          this.log("CCCD write skipped", { characteristicUuid, err: String(err) });
        }
      }
    }
  }

  private async monitorCharacteristic(serviceUuid: string, characteristicUuid: string) {
    try {
      const subscription = this.device.monitorCharacteristicForService(
        serviceUuid,
        characteristicUuid,
        (error, characteristic) => {
          if (error) {
            const msg = String((error as Error).message || error);
            if (!msg.includes("Operation was cancelled")) {
              this.log("notification error", {
                serviceUuid,
                characteristicUuid,
                error: msg,
              });
            }
            return;
          }
          if (!characteristic?.value) {
            return;
          }
          this.handleChunk(Buffer.from(characteristic.value, "base64"));
        }
      );
      this.subscriptions.push(subscription);
      this.log("monitoringCharacteristic", { serviceUuid, characteristicUuid });
    } catch (err) {
      this.log("monitorCharacteristic_failed", {
        serviceUuid,
        characteristicUuid,
        err: String(err),
      });
    }
  }

  private async writeRx(payload: Buffer) {
    const base64 = toBase64(payload);
    const hex = payload.toString("hex");
    this.log("NUS write_attempt", { hex });

    // Prefer write with response (safer) and fall back to without-response if needed.
    try {
      await this.device.writeCharacteristicWithResponseForService(
        GATT.NUS_SERVICE,
        GATT.NUS_RX,
        base64
      );
      this.log("NUS write_done", { hex, method: "withResponse" });
      return;
    } catch (errWith) {
      this.log("NUS write_withResponse_failed", { hex, err: String(errWith) });
      try {
        await this.device.writeCharacteristicWithoutResponseForService(
          GATT.NUS_SERVICE,
          GATT.NUS_RX,
          base64
        );
        this.log("NUS write_done", { hex, method: "withoutResponse" });
        return;
      } catch (errWithout) {
        this.log("NUS write_failed", { hex, err: String(errWithout) });
        throw errWithout;
      }
    }
  }

  async sendBindHandshake(): Promise<void> {
    await this.writeRx(BIND_CONFIRM);
    await this.writeRx(SESSION_SYNC_ACK);
  }

  private handleChunk(chunk: Buffer) {
    this.log("NUS chunk", {
      hex: chunk.toString("hex"),
      length: chunk.length,
    });

    const immediate = parseNotificationChunk(chunk);
    if (immediate?.kind === "fd") {
      this.handleFdFrame(immediate);
      return;
    }

    const frame = this.reassembler.push(chunk);
    if (!frame) {
      return;
    }

    this.log("DF frame", {
      subCommand: `0x${frame.subCommand.toString(16)}`,
      hex: frame.raw.toString("hex"),
    });

    this.handleDfFrame(frame);
  }

  private handleFdFrame(frame: ParsedFdFrame) {
    this.log("FD frame", {
      opcode: `0x${frame.opcode.toString(16)}`,
      hex: frame.raw.toString("hex"),
    });

    if (FD_ACK_OPCODES.has(frame.opcode)) {
      this.sendSessionSyncAck().catch(() => {});
    }
  }

  private async sendSessionSyncAck() {
    const now = Date.now();
    if (now - this.lastFdAckAt < 20) {
      return;
    }
    this.lastFdAckAt = now;
    this.log("sendSessionSyncAck", { hex: SESSION_SYNC_ACK.toString("hex") });
    try {
      await this.writeRx(SESSION_SYNC_ACK);
    } catch (err) {
      this.log("sendSessionSyncAck_failed", { err: String(err) });
    }
  }

  private handleDfFrame(frame: ParsedDfFrame) {
    if (frame.subCommand === 0x08 && frame.payload[0] === 0x01) {
      this.sendBindHandshake().catch(() => {});
    }

    if (isBpMeasurementStarted(frame)) {
      this.options.onBpStarted?.();
      this.measureStartedResolve?.();
      this.measureStartedResolve = null;
      this.sendSessionSyncAck().catch(() => {});
    }

    const vital = tryParseVitalFromDfFrame(frame);
    if (!vital) {
      this.log("vital_parse_skipped", {
        subCommand: `0x${frame.subCommand.toString(16)}`,
        raw: frame.raw.toString("hex"),
      });
      return;
    }

    this.log("vital_parsed", {
      subCommand: `0x${frame.subCommand.toString(16)}`,
      vital,
      raw: frame.raw.toString("hex"),
    });

    if (vital.heartRate > 0 && vital.systolic === 0) {
      this.lastHeartRate = vital.heartRate;
      if (isHrResultFrame(frame)) {
        this.options.onVital?.(vital);
      } else {
        this.options.onVital?.({
          systolic: 0,
          diastolic: 0,
          heartRate: vital.heartRate,
        });
      }
      return;
    }

    if (isBpResultFrame(frame) || validBpReading(vital)) {
      this.options.onVital?.({
        systolic: vital.systolic,
        diastolic: vital.diastolic,
        heartRate: vital.heartRate || this.lastHeartRate || 70,
      });
    }
  }

  /** Prime the link, send start command, confirm watch entered measure mode. */
  private async activateMeasurementOnWatch(startCommand: Buffer): Promise<void> {
    this.log("activateMeasurementOnWatch_start", { startHex: startCommand.toString("hex") });
    await this.sendSessionSyncAck();
    await sleep(50);
    await this.sendSessionSyncAck();

    const started = this.waitForMeasureStarted(6000);
    try {
      await this.writeRx(startCommand);
    } catch (err) {
      this.log("write_start_command_failed", { err: String(err), startHex: startCommand.toString("hex") });
    }
    const watchAcked = await started;

    if (!watchAcked) {
      this.log("Measure start not acked, retrying start command");
      await this.sendSessionSyncAck();
      await sleep(80);
      const retry = this.waitForMeasureStarted(5000);
      try {
        await this.writeRx(startCommand);
      } catch (err) {
        this.log("write_start_command_retry_failed", { err: String(err), startHex: startCommand.toString("hex") });
      }
      await retry;
    }

    await this.sendSessionSyncAck();
  }

  private waitForMeasureStarted(timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.measureStartedResolve = null;
        resolve(false);
      }, timeoutMs);

      this.measureStartedResolve = () => {
        clearTimeout(timer);
        resolve(true);
      };
    });
  }

  async startBloodPressureMeasurement(): Promise<void> {
    await this.activateMeasurementOnWatch(START_BP_MEASUREMENT);
  }

  async startHeartRateMeasurement(): Promise<void> {
    await this.activateMeasurementOnWatch(START_HR_MEASUREMENT);
  }

  /** Register result listener, then activate the watch (order matters). */
  async measureBloodPressure(timeoutMs = 60000): Promise<VitalMeasurement | null> {
    const resultPromise = this.waitForBloodPressureResult(timeoutMs);
    await sleep(20);
    await this.activateMeasurementOnWatch(START_BP_MEASUREMENT);
    return resultPromise;
  }

  async measureHeartRate(timeoutMs = 60000): Promise<VitalMeasurement | null> {
    const resultPromise = this.waitForHeartRateResult(timeoutMs);
    await sleep(20);
    await this.activateMeasurementOnWatch(START_HR_MEASUREMENT);
    return resultPromise;
  }

  /**
   * Wait for a BP result frame up to timeoutMs.
   * Returns null if the watch does not deliver a reading in time.
   */
  waitForBloodPressureResult(timeoutMs = 60000): Promise<VitalMeasurement | null> {
    this.log("waitForBloodPressureResult_start", { timeoutMs });
    return this.waitForVital(
      (reading) => reading.systolic > 0 && reading.diastolic > 0,
      timeoutMs
    );
  }

  waitForHeartRateResult(timeoutMs = 60000): Promise<VitalMeasurement | null> {
    return this.waitForVital(
      (reading) => reading.heartRate > 0 && reading.systolic === 0,
      timeoutMs
    );
  }

  private waitForVital(
    isMatch: (reading: VitalMeasurement) => boolean,
    timeoutMs: number
  ): Promise<VitalMeasurement | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.log("waitForVital_timeout", { timeoutMs });
        cleanup();
        resolve(null);
      }, timeoutMs);

      const prevOnVital = this.options.onVital;
      const handler = (reading: VitalMeasurement) => {
        this.log("waitForVital_received", { reading });
        prevOnVital?.(reading);
        if (isMatch(reading)) {
          cleanup();
          resolve(reading);
        }
      };

      this.options.onVital = handler;

      const cleanup = () => {
        clearTimeout(timer);
        this.options.onVital = prevOnVital;
      };
    });
  }

  dispose() {
    this.subscriptions.forEach((sub) => sub.remove());
    this.subscriptions = [];
    this.reassembler.reset();
  }
}

function validBpReading(vital: VitalMeasurement) {
  return (
    vital.systolic >= 70 &&
    vital.systolic <= 250 &&
    vital.diastolic >= 40 &&
    vital.diastolic <= 160 &&
    vital.diastolic < vital.systolic
  );
}

export function isHryfineDevice(device: {
  name?: string | null;
  localName?: string | null;
  serviceUUIDs?: string[] | null;
}) {
  const name = (device.name || device.localName || "").toLowerCase();
  const uuids = (device.serviceUUIDs || []).map((u) => u.toLowerCase());
  const hasExpectedService = uuids.some((u) =>
    ["6e400001", "0000ff00", "0000ff12"].some((id) => u.includes(id))
  );
  return (
    /watch|hryfine|hyfit|ultra|smartwatch|wearable|health|bp|pressure/.test(name) ||
    hasExpectedService
  );
}
