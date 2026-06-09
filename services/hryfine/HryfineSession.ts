import { Buffer } from "buffer";
import type { Device, Subscription } from "react-native-ble-plx";
import { GATT } from "./constants";
import {
  DfFrameReassembler,
  isBpMeasurementStarted,
  isBpResultFrame,
  isHrResultFrame,
  tryParseVitalFromDfFrame,
  type ParsedDfFrame,
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

export class HryfineSession {
  private device: Device;
  private reassembler = new DfFrameReassembler();
  private subscription: Subscription | null = null;
  private options: HryfineSessionOptions;
  private lastHeartRate = 0;

  constructor(device: Device, options: HryfineSessionOptions = {}) {
    this.device = device;
    this.options = options;
  }

  private log(message: string, data?: Record<string, unknown>) {
    this.options.onLog?.(message, data);
  }

  async setup(): Promise<void> {
    await this.device.discoverAllServicesAndCharacteristics();
    await this.enableNotifications(GATT.NUS_TX);
    await this.enableNotifications(GATT.FF01_NOTIFY);
    await this.enableNotifications(GATT.FF14_NOTIFY);
    this.subscription = this.device.monitorCharacteristicForService(
      GATT.NUS_SERVICE,
      GATT.NUS_TX,
      (error, characteristic) => {
        if (error) {
          const msg = String((error as Error).message || error);
          if (!msg.includes("Operation was cancelled")) {
            this.log("NUS notification error", { error: msg });
          }
          return;
        }
        if (!characteristic?.value) {
          return;
        }
        this.handleChunk(Buffer.from(characteristic.value, "base64"));
      }
    );
    this.log("Hryfine session ready");
  }

  private async enableNotifications(characteristicUuid: string) {
    try {
      await this.device.writeDescriptorForService(
        GATT.NUS_SERVICE,
        GATT.NUS_TX,
        GATT.CCCD,
        toBase64(Buffer.from([0x01, 0x00]))
      );
    } catch {
      // Some characteristics live on other services — enable per-service below.
    }

    const services = await this.device.services();
    for (const service of services) {
      const characteristics = await service.characteristics();
      const match = characteristics.find(
        (c) => c.uuid.toLowerCase() === characteristicUuid.toLowerCase()
      );
      if (!match || !match.isNotifiable) {
        continue;
      }
      try {
        await this.device.writeDescriptorForService(
          service.uuid,
          characteristicUuid,
          GATT.CCCD,
          toBase64(Buffer.from([0x01, 0x00]))
        );
      } catch (err) {
        this.log("CCCD write skipped", { characteristicUuid, err: String(err) });
      }
    }
  }

  private async writeRx(payload: Buffer) {
    const base64 = toBase64(payload);
    this.log("NUS write", { hex: payload.toString("hex") });
    try {
      await this.device.writeCharacteristicWithResponseForService(
        GATT.NUS_SERVICE,
        GATT.NUS_RX,
        base64
      );
      return;
    } catch {
      await this.device.writeCharacteristicWithoutResponseForService(
        GATT.NUS_SERVICE,
        GATT.NUS_RX,
        base64
      );
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

  private handleDfFrame(frame: ParsedDfFrame) {
    if (frame.subCommand === 0x08 && frame.payload[0] === 0x01) {
      this.sendBindHandshake().catch(() => {});
    }

    if (isBpMeasurementStarted(frame)) {
      this.options.onBpStarted?.();
    }

    const vital = tryParseVitalFromDfFrame(frame);
    if (!vital) {
      return;
    }

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

  async startBloodPressureMeasurement(): Promise<void> {
    await this.writeRx(SESSION_SYNC_ACK);
    await this.writeRx(START_BP_MEASUREMENT);
  }

  async startHeartRateMeasurement(): Promise<void> {
    await this.writeRx(SESSION_SYNC_ACK);
    await this.writeRx(START_HR_MEASUREMENT);
  }

  /**
   * Wait for a BP result frame up to timeoutMs.
   * Returns null if the watch does not deliver a reading in time.
   */
  waitForBloodPressureResult(timeoutMs = 90000): Promise<VitalMeasurement | null> {
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
        cleanup();
        resolve(null);
      }, timeoutMs);

      const prevOnVital = this.options.onVital;
      const handler = (reading: VitalMeasurement) => {
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
    this.subscription?.remove();
    this.subscription = null;
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
