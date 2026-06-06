import createContextHook from "@nkzw/create-context-hook";
import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  saveVitalReading,
  getVitalReadings,
  getLatestReading,
} from "@/services/readings";
import {
  saveDevice,
  disconnectDevice as disconnectDeviceDB,
  getConnectedDevices,
} from "@/services/devices";
import { createNotification } from "@/services/notifications";
import { computePrediction, computeXAIInsights, createPrediction, createXAIInsight } from "@/services/predictions";
import { BleManager } from "react-native-ble-plx";
import { PermissionsAndroid, Platform, Alert } from "react-native";
import { Buffer } from "buffer";

export type BLEDevice = {
  id: string;
  name: string;
  rssi: number;
  connected: boolean;
};

export type VitalReading = {
  systolic: number;
  diastolic: number;
  heartRate: number;
  timestamp: Date;
  source: "ble" | "manual";
};

type BLEState = {
  isScanning: boolean;
  isMeasuring: boolean;
  connectedDevice: BLEDevice | null;
  discoveredDevices: BLEDevice[];
  lastReading: VitalReading | null;
  history: VitalReading[];
  isLoading: boolean;
  startScan: () => void;
  stopScan: () => void;
  connectDevice: (id: string) => void;
  disconnectDevice: () => void;
  startMeasurement: () => void;
  stopMeasurement: () => void;
  addManualReading: (systolic: number, diastolic: number, heartRate: number) => Promise<void>;
  refreshHistory: () => Promise<void>;
};

const bleManager = new BleManager();

const WATCH_SERVICE_UUIDS = [
  "180f",
  "180a",
  "6e400001-b5a3-f393-e0a9-e50e24dcca9f",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ff10-0000-1000-8000-00805f9b34fb",
  "0000ff12-0000-1000-8000-00805f9b34fb",
];

const NUS_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9f";
const NUS_RX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9f";
const NUS_TX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9f";

const base64ToHex = (value: string) => {
  try {
    return Buffer.from(value, "base64").toString("hex");
  } catch (err) {
    return "";
  }
};

const isRelevantDevice = (device: {
  name?: string | null;
  localName?: string | null;
  serviceUUIDs?: string[] | null;
}) => {
  const name = (device.name || device.localName || "").toLowerCase();
  const serviceUUIDs = (device.serviceUUIDs || []).map((uuid) => uuid.toLowerCase());

  const matchesName = /watch|blood|bp|pressure|monitor|device|sphygmomanometer/.test(name);
  const matchesService = serviceUUIDs.some((uuid) => WATCH_SERVICE_UUIDS.includes(uuid));

  return matchesName || matchesService;
};

const isValidBloodPressure = (systolic: number, diastolic: number) => {
  return (
    systolic >= 70 &&
    systolic <= 250 &&
    diastolic >= 40 &&
    diastolic <= 160 &&
    diastolic < systolic
  );
};

const isValidHeartRate = (heartRate: number) => {
  return heartRate >= 30 && heartRate <= 220;
};

type NUSParseResult = {
  reading: VitalReading;
  method: "ascii" | "exact" | "fallback";
};

export const [BLEProvider, useBLE] = createContextHook(() => {
  const { user } = useAuth();

  const [isScanning, setIsScanning] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<BLEDevice | null>(null);
  const [discoveredDevices, setDiscoveredDevices] = useState<BLEDevice[]>([]);
  const [lastReading, setLastReading] = useState<VitalReading | null>(null);
  const [history, setHistory] = useState<VitalReading[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const disconnectSubscriptionRef = useRef<any>(null);

  const checkBluetoothEnabled = async (_userId?: string) => {
    try {
      if (Platform.OS === "android") {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];

        // Android 12+ requires BLUETOOTH_SCAN and BLUETOOTH_CONNECT
        if (Platform.Version >= 31) {
          permissions.push(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
          );
        }

        const results = await PermissionsAndroid.requestMultiple(permissions);
        
        // Check if all required permissions are granted
        return Object.values(results).every(
          (result) => result === PermissionsAndroid.RESULTS.GRANTED
        );
      }
      return true;
    } catch (err) {
      console.error("Permission request error:", err);
      return true;
    }
  };

  const startScan = useCallback(async () => {
    try {
      if (user) {
        const isBluetoothEnabled = await checkBluetoothEnabled(user.id);
        if (!isBluetoothEnabled) {
          Alert.alert(
            "Bluetooth Permission Required",
            "Please enable location permission to scan for Bluetooth devices.",
            [{ text: "OK" }]
          );
          return;
        }
      }

      setIsScanning(true);
      setDiscoveredDevices([]);

      let deviceFoundDuringFirstSecond = false;

      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error("BLE scan error:", error);
          const errorMessage = error.message?.toLowerCase() || "";
          
          // Detect Bluetooth OFF error
          if (
            errorMessage.includes("bluetooth") ||
            errorMessage.includes("off") ||
            errorMessage.includes("enable") ||
            errorMessage.includes("permission") ||
            error.code === "BluetoothNotSupported" ||
            error.code === "BluetoothNotEnabled"
          ) {
            setIsScanning(false);
            bleManager.stopDeviceScan();
            Alert.alert(
              "Bluetooth is Off",
              "Please turn on Bluetooth on your device to scan for wearables.",
              [{ text: "OK" }]
            );
          }
          return;
        }

        if (!device) {
          return;
        }

        deviceFoundDuringFirstSecond = true;

        if (!isRelevantDevice(device)) {
          return;
        }

        const displayName = device.name || device.localName || "Unknown Device";
        setDiscoveredDevices((prev) => {
          const exists = prev.some((d) => d.id === device.id);
          if (!exists) {
            return [
              ...prev,
              {
                id: device.id,
                name: displayName,
                rssi: device.rssi || -100,
                connected: false,
              },
            ];
          }
          return prev;
        });
      });

      // Stop scanning after 10 seconds
      setTimeout(async () => {
        bleManager.stopDeviceScan();
        setIsScanning(false);
        
        // Check if any devices were found and notify user
        setDiscoveredDevices((devices) => {
          if (devices.length === 0) {
            Alert.alert(
              "No Devices Found",
              "No Bluetooth health devices were found. Please ensure your device is powered on and within range.",
              [{ text: "OK" }]
            );
          }
          return devices;
        });
      }, 10000);
    } catch (err) {
      console.error("Failed to start BLE scan:", err);
      setIsScanning(false);
      Alert.alert(
        "Scan Error",
        "Failed to scan for Bluetooth devices. Please try again.",
        [{ text: "OK" }]
      );
    }
  }, [user]);

  const stopScan = useCallback(() => {
    setIsScanning(false);
  }, []);

  const connectDevice = useCallback(
    async (id: string) => {
      try {
        // Check if Bluetooth is enabled before connecting
        if (user) {
          const isBluetoothEnabled = await checkBluetoothEnabled(user.id);
          if (!isBluetoothEnabled) {
            return;
          }
        }

        const device = await bleManager.connectToDevice(id);
        await device.discoverAllServicesAndCharacteristics();

        const connected: BLEDevice = {
          id: device.id,
          name: device.name || "Connected Device",
          rssi: device.rssi || -70,
          connected: true,
        };

        setConnectedDevice(connected);

        if (user) {
          try {
            await saveDevice(user.id, connected);
          } catch (err) {
            console.error("Failed to save device:", err);
          }
        }

        Alert.alert(
          "Device Connected",
          `Successfully connected to ${connected.name}`,
          [{ text: "OK" }]
        );
      } catch (err) {
        console.error("Failed to connect to device:", err);
        Alert.alert(
          "Connection Failed",
          "Failed to connect to the selected device. Please try again.",
          [{ text: "OK" }]
        );
      }
    },
    [user]
  );

  const disconnectDevice = useCallback(async () => {
    if (connectedDevice) {
      try {
        await bleManager.cancelDeviceConnection(connectedDevice.id);
      } catch (err) {
        console.error("Error disconnecting device:", err);
      }
    }

    if (user && connectedDevice) {
      try {
        await disconnectDeviceDB(user.id, connectedDevice.id);
      } catch (err) {
        console.error("Failed to disconnect device from database:", err);
      }
    }

    // Remove any existing disconnect subscription
    if (disconnectSubscriptionRef.current) {
      disconnectSubscriptionRef.current?.remove();
      disconnectSubscriptionRef.current = null;
    }

    setConnectedDevice(null);
    Alert.alert(
      "Device Disconnected",
      connectedDevice ? `${connectedDevice.name} has been disconnected.` : "Your device has been disconnected.",
      [{ text: "OK" }]
    );
  }, [user, connectedDevice]);

  const processNewReading = useCallback(
  async (reading: VitalReading) => {
    // 1. Instantly update the local UI states for an immediate visual feedback loop
    setLastReading(reading);
    setHistory((prev) => [reading, ...prev]);

    // 2. Auth Session Guard
    if (!user) {
      console.warn("⚠️ Database transaction aborted: No authenticated user found in BLEContext.");
      return;
    }

    let savedReadingRow = null;

    // STEP 1: Secure the vital reading inside the database primary ledger
    try {
      console.log("Saving vital reading to Supabase...", reading);
      savedReadingRow = await saveVitalReading(user.id, reading);
      console.log("✅ Core vital reading successfully committed to Supabase:", savedReadingRow);
    } catch (err) {
      console.error("❌ CRITICAL DB ERROR: Primary vital reading failed to save:", err);
      // Exit here because downstream metrics depend directly on a successful database row write
      return; 
    }

    // STEP 2: Process background calculations (ML, XAI, Notifications) safely in isolation
    try {
      console.log("Processing background AI models and alerts...");
      
      // Calculate and send ML prediction
      const prediction = computePrediction(reading);
      await createPrediction(user.id, savedReadingRow.id, prediction);

      // Map and send XAI Explanations
      const xaiInsights = computeXAIInsights(reading);
      for (const insight of xaiInsights) {
        await createXAIInsight(user.id, savedReadingRow.id, insight);
      }

      // Dispatch real-time crisis notifications
      if (reading.systolic >= 180 || reading.diastolic >= 120) {
        await createNotification(user.id, {
          title: "Hypertensive Crisis Detected",
          body: `Your BP reading of ${reading.systolic}/${reading.diastolic} mmHg is in the crisis range. Seek medical attention immediately.`,
          type: "alert",
        });
      } else if (reading.systolic >= 160 || reading.diastolic >= 100) {
        await createNotification(user.id, {
          title: "High Blood Pressure Alert",
          body: `Your systolic reading of ${reading.systolic} mmHg is elevated. Rest and re-measure in 15 minutes.`,
          type: "alert",
        });
      }
      
      console.log("✅ Background analytics and notification queries complete.");
    } catch (auxErr) {
      // If an ML module or notification dispatch breaks, log it as a warning, but do NOT disrupt the user save!
      console.warn("⚠️ Secondary AI/Notification features failed, but core reading remains safe:", auxErr);
    }
  },
  [user]
);

  const tryParseNUSReading = useCallback((buffer: Buffer): NUSParseResult | null => {
    const ascii = buffer.toString("ascii").trim();
    const hex = buffer.toString("hex");
    const timestamp = new Date();

    const validBp = (sys: number, dia: number, hr: number) => {
      return (
        sys >= 70 && sys <= 250 &&
        dia >= 40 && dia <= 160 &&
        hr >= 30 && hr <= 220 &&
        dia < sys
      );
    };

    const buildReading = (sys: number, dia: number, hr: number) => {
      if (!validBp(sys, dia, hr)) {
        return null;
      }
      return { systolic: sys, diastolic: dia, heartRate: hr, timestamp, source: "ble" };
    };

    if (ascii) {
      const normalized = ascii.replace(/[^\d\/\s\-,]/g, " ").trim();
      const pieces = normalized.match(/\d{2,3}/g);
      if (pieces && pieces.length >= 2) {
        const sys = Number(pieces[0]);
        const dia = Number(pieces[1]);
        const hr = pieces.length >= 3 ? Number(pieces[2]) : 70;
        const parsed = buildReading(sys, dia, hr);
        if (parsed) {
          console.log("Parsed NUS ASCII payload:", ascii, "=>", parsed);
          return { reading: parsed, method: "ascii" };
        }
      }
    }

    const candidates: Array<{ reading: VitalReading; score: number; reason: string }> = [];
    const addCandidate = (sys: number, dia: number, hr: number, reason: string) => {
      const parsed = buildReading(sys, dia, hr);
      if (parsed) {
        let score = Math.abs(sys - 120) + Math.abs(dia - 80) + Math.abs(hr - 70);
        if (hr < 50) {
          score += 30;
        }
        if (hr > 140) {
          score += 20;
        }
        candidates.push({ reading: parsed, score, reason });
      }
    };

    if (buffer.length >= 20 && buffer[0] === 0xdf && buffer[1] === 0x00 && buffer[2] === 0x11) {
      const body = buffer.slice(3);
      if (body.length >= 17) {
        const extraFlags = body[12];
        const systolic = body[6] * 2 + extraFlags;
        const diastolic = body[1] * 16 + (extraFlags & 0x03);
        const heartRate = body[5] * 8;

        if (extraFlags !== 0) {
          const parsed = buildReading(systolic, diastolic, heartRate);
          if (parsed) {
            console.log("Parsed NUS DF final-measurement packet:", hex, {
              systolic,
              diastolic,
              heartRate,
              extraFlags,
              body0: body[0],
            });
            return { reading: parsed, method: "exact" };
          }
        }

        const rawSystolic = body.readUInt16LE(1);
        const rawDiastolic = body.readUInt16LE(3);
        const rawHeartRate = body[5];

        addCandidate(Math.round(rawSystolic / 2), rawDiastolic * 16, rawHeartRate * 8, "df-le-exact");
        addCandidate(Math.round(rawSystolic / 2), rawDiastolic * 16, rawHeartRate * 4, "df-le-hr4");
        addCandidate(Math.round(rawSystolic / 2), rawDiastolic * 16, rawHeartRate, "df-le-hr1");
        addCandidate(Math.round(rawSystolic / 4), rawDiastolic * 8, rawHeartRate * 8, "df-le-alt-scale");

        if (candidates.length > 0) {
          candidates.sort((a, b) => a.score - b.score);
          console.log("Parsed NUS DF packet candidate fallback:", hex, candidates[0]);
          return { reading: candidates[0].reading, method: "fallback" };
        }
      }
    }

    if (buffer.length >= 3) {
      for (let offset = 0; offset + 2 < buffer.length; offset += 1) {
        const sys = buffer[offset];
        const dia = buffer[offset + 1];
        const hr = buffer[offset + 2];
        const parsed = buildReading(sys, dia, hr);
        if (parsed) {
          console.log("Parsed NUS raw 3-byte payload:", hex, "=>", parsed);
          return { reading: parsed, method: "fallback" };
        }
      }
    }

    const scaleFactors = [1, 0.5, 0.25, 2, 4, 16];
    if (buffer.length >= 3) {
      for (let offset = 0; offset + 2 < buffer.length; offset += 1) {
        for (const scaleSys of scaleFactors) {
          for (const scaleDia of scaleFactors) {
            for (const scaleHr of scaleFactors) {
              const sys = Math.round(buffer[offset] * scaleSys);
              const dia = Math.round(buffer[offset + 1] * scaleDia);
              const hr = Math.round(buffer[offset + 2] * scaleHr);
              const parsed = buildReading(sys, dia, hr);
              if (parsed) {
                console.log("Parsed NUS scaled payload:", { offset, scaleSys, scaleDia, scaleHr, hex, parsed });
                return { reading: parsed, method: "fallback" };
              }
            }
          }
        }
      }
    }

    if (buffer.length >= 6) {
      for (let offset = 0; offset + 5 < buffer.length; offset += 1) {
        const sys = buffer.readUInt16LE(offset);
        const dia = buffer.readUInt16LE(offset + 2);
        const hr = buffer[offset + 4];
        const parsed = buildReading(sys, dia, hr);
        if (parsed) {
          console.log("Parsed NUS 16-bit LE payload:", hex, "=>", parsed);
          return { reading: parsed, method: "fallback" };
        }
      }
      for (let offset = 0; offset + 5 < buffer.length; offset += 1) {
        const sys = buffer.readUInt16BE(offset);
        const dia = buffer.readUInt16BE(offset + 2);
        const hr = buffer[offset + 4];
        const parsed = buildReading(sys, dia, hr);
        if (parsed) {
          console.log("Parsed NUS 16-bit BE payload:", hex, "=>", parsed);
          return { reading: parsed, method: "fallback" };
        }
      }
    }

    return null;
  }, []);

  const startMeasurement = useCallback(async () => {
    if (!connectedDevice) {
      console.warn("Attempted to start measurement with no connected device");
      Alert.alert(
        "No Device Connected",
        "Please connect a BLE device before starting a measurement.",
        [{ text: "OK" }]
      );
      return;
    }

    setIsMeasuring(true);

    try {
      const BP_SERVICE_UUID = "180b";
      const BP_MEASUREMENT_UUID = "2a35";
      const HEART_RATE_SERVICE_UUID = "180d";
      const HEART_RATE_MEASUREMENT_UUID = "2a37";

      const serviceFilter = [
        NUS_SERVICE_UUID,
        BP_SERVICE_UUID,
        HEART_RATE_SERVICE_UUID,
      ];

      let device = null;
      try {
        const connectedDevices = await bleManager.connectedDevices(serviceFilter);
        device = connectedDevices.find((d) => d.id === connectedDevice.id) || null;
      } catch (error) {
        console.warn("connectedDevices lookup failed, falling back to devices():", error);
      }

      if (!device) {
        const devices = await bleManager.devices([connectedDevice.id]);
        device = devices[0] || null;
      }

      if (!device) {
        throw new Error("Device not found in BLE manager");
      }

      const isConnected = await bleManager.isDeviceConnected(device.id);
      if (!isConnected) {
        device = await bleManager.connectToDevice(device.id, { autoConnect: true });
      }

      await device.discoverAllServicesAndCharacteristics();

      let systolic: number | null = null;
      let diastolic: number | null = null;
      let heartRate: number | null = null;
      const hasCompleteMeasurement = () => systolic !== null && diastolic !== null && heartRate !== null;

      try {
        const services = await device.services();
        let bpCharacteristic = null;
        let hrCharacteristic = null;
        let nusCharacteristicRx = null;
        let nusCharacteristicTx = null;

        for (const service of services) {
          const characteristics = await service.characteristics();

          for (const characteristic of characteristics) {
            const uuid = characteristic.uuid.toLowerCase();
            if (uuid === BP_MEASUREMENT_UUID) {
              bpCharacteristic = characteristic;
            }
            if (uuid === HEART_RATE_MEASUREMENT_UUID) {
              hrCharacteristic = characteristic;
            }
            if (uuid === NUS_RX_UUID) {
              nusCharacteristicRx = characteristic;
            }
            if (uuid === NUS_TX_UUID) {
              nusCharacteristicTx = characteristic;
            }
          }
        }

        if (bpCharacteristic) {
          const data = await bpCharacteristic.read();
          if (data.value) {
            const buffer = Buffer.from(data.value, "base64");
            if (buffer.length >= 7) {
              const sys = buffer.readUInt16LE(1);
              const dia = buffer.readUInt16LE(3);
              if (isValidBloodPressure(sys, dia)) {
                systolic = sys;
                diastolic = dia;
              } else {
                console.warn("Invalid BP measurement values read from characteristic:", {
                  sys,
                  dia,
                  hex: buffer.toString("hex"),
                });
              }
            }
          }
        }

        if (hrCharacteristic) {
          const data = await hrCharacteristic.read();
          if (data.value) {
            const buffer = Buffer.from(data.value, "base64");
            if (buffer.length >= 2) {
              const hr = buffer.readUInt8(1);
              if (isValidHeartRate(hr)) {
                heartRate = hr;
              } else {
                console.warn("Invalid heart rate value read from characteristic:", {
                  heartRate: hr,
                  hex: buffer.toString("hex"),
                });
              }
            }
          }
        }

        if (!hasCompleteMeasurement() && nusCharacteristicRx && nusCharacteristicTx) {
          console.log("NUS discovery:", {
            deviceId: device.id,
            rx: nusCharacteristicRx.uuid,
            tx: nusCharacteristicTx.uuid,
          });

          const notifications: Buffer[] = [];
          let subscriptionError: Error | null = null;
          let measurementMethod: "ascii" | "exact" | "fallback" | "unknown" = "unknown";
          let measurementAttempt = 0;
          const maxAttempts = 2;

          while (measurementAttempt < maxAttempts && !hasCompleteMeasurement()) {
            measurementAttempt++;
            console.log(`NUS measurement attempt ${measurementAttempt}/${maxAttempts}`);
            notifications.length = 0;

            const subscription = device.monitorCharacteristicForService(
              NUS_SERVICE_UUID,
              NUS_TX_UUID,
              (error, characteristic) => {
                if (error) {
                  const reason =
                    (error as any)?.reason ||
                    String((error as any)?.message || error);
                  if (typeof reason === "string" && reason.includes("Operation was cancelled")) {
                    return;
                  }
                  console.warn("NUS notification error:", error);
                  subscriptionError = error as Error;
                  return;
                }

                if (!characteristic?.value) {
                  return;
                }

                const payload = Buffer.from(characteristic.value, "base64");
                console.log(
                  "NUS notification:",
                  payload.toString("hex"),
                  payload.toString("ascii")
                );
                notifications.push(payload);
              }
            );

            console.log("NUS subscription established, sending commands...");

            const candidateCommands = [
              Buffer.from([0x01]),
              Buffer.from([0x02]),
              Buffer.from([0xa1]),
              Buffer.from("start\r\n"),
              Buffer.from("measure\r\n"),
              Buffer.from("I\r\n"),
            ];

            const writeNusCommand = async (command: Buffer) => {
              const base64 = command.toString("base64");
              console.log("NUS write attempt:", command.toString("hex"), command.toString("ascii"));
              try {
                await device.writeCharacteristicWithResponseForService(
                  NUS_SERVICE_UUID,
                  NUS_RX_UUID,
                  base64
                );
                return;
              } catch (writeErr) {
                console.warn("NUS write with response failed, trying without response:", writeErr);
              }
              try {
                await device.writeCharacteristicWithoutResponseForService(
                  NUS_SERVICE_UUID,
                  NUS_RX_UUID,
                  base64
                );
              } catch (writeErr) {
                console.warn("NUS write without response failed:", writeErr);
              }
            };

            for (const command of candidateCommands) {
              await writeNusCommand(command);
              await new Promise((resolve) => setTimeout(resolve, 700));
            }

            console.log("Commands sent, waiting 10 seconds for device response...");
            await new Promise((resolve) => setTimeout(resolve, 10000));
            subscription?.remove();

            if (subscriptionError) {
              console.error("NUS subscription encountered error:", subscriptionError);
            }

            if (notifications.length === 0) {
              console.warn(
                `Attempt ${measurementAttempt}: No NUS notifications received. Error: ${subscriptionError?.message || "none"}`
              );
              if (measurementAttempt < maxAttempts) {
                console.log("Retrying after brief delay...");
                await new Promise((resolve) => setTimeout(resolve, 2000));
              }
            } else {
              console.log(`Attempt ${measurementAttempt}: Received ${notifications.length} notification(s)`);
            }

            for (const payload of notifications) {
              const parsed = tryParseNUSReading(payload);
              if (parsed) {
                measurementMethod = parsed.method;
                systolic = parsed.reading.systolic;
                diastolic = parsed.reading.diastolic;
                heartRate = parsed.reading.heartRate;
                console.log("Parsed measurement:", { systolic, diastolic, heartRate, method: measurementMethod });
                break;
              }
            }

            if (!hasCompleteMeasurement() && notifications.length > 1) {
              const combined = Buffer.concat(notifications);
              const parsed = tryParseNUSReading(combined);
              if (parsed) {
                measurementMethod = parsed.method;
                systolic = parsed.reading.systolic;
                diastolic = parsed.reading.diastolic;
                heartRate = parsed.reading.heartRate;
                console.log("Parsed combined measurement:", { systolic, diastolic, heartRate, method: measurementMethod });
              }
            }
          }

          if (!hasCompleteMeasurement() && notifications.length === 0) {
            console.warn("Device not responding to NUS commands. Manual entry may be required.");
          }

          if (measurementMethod === "fallback") {
            Alert.alert(
              "Measurement May Be Inaccurate",
              "This watch is using a nonstandard BLE payload format. The reading may not be fully accurate.",
              [{ text: "OK" }]
            );
          }
        }
      } catch (readErr) {
        console.warn("Could not read BLE characteristics:", readErr);
        Alert.alert(
          "Reading in Progress",
          "Measurement is being taken from your device...",
          [{ text: "OK" }]
        );
      }

      if (systolic === null || diastolic === null || heartRate === null) {
        console.error(
          "No valid BLE measurement acquired. systolic:",
          systolic,
          "diastolic:",
          diastolic,
          "heartRate:",
          heartRate
        );
        if (user) {
          await createNotification(user.id, {
            title: "Measurement Failed",
            body: "Could not get a valid measurement from the device. Please check if it's still connected and try again.",
            type: "device",
          }).catch(() => {});
        }
        throw new Error("No valid BLE measurement found");
      }

      const reading: VitalReading = {
        systolic,
        diastolic,
        heartRate,
        timestamp: new Date(),
        source: "ble",
      };

      await processNewReading(reading);
      setIsMeasuring(false);
    } catch (err) {
      console.error("Failed to read measurement from device:", err);
      setIsMeasuring(false);
      Alert.alert(
        "Measurement Failed",
        "Failed to read measurement from device. Please try again.",
        [{ text: "OK" }]
      );
    }
  }, [connectedDevice, processNewReading, tryParseNUSReading, user]);

  const stopMeasurement = useCallback(() => {
    setIsMeasuring(false);
  }, []);

  // Setup disconnect listener when device is connected
  useEffect(() => {
    if (!connectedDevice || !user) {
      return;
    }

    // Monitor the device connection state
    const subscription = bleManager.onDeviceDisconnected(
      connectedDevice.id,
      async (error) => {
        console.log("Device disconnected:", connectedDevice.name, error);

        Alert.alert(
          "Device Disconnected",
          `Your ${connectedDevice.name} has been disconnected.`,
          [{ text: "OK" }]
        );

        // Update database
        try {
          await disconnectDeviceDB(user.id, connectedDevice.id);
        } catch (err) {
          console.error("Failed to update device disconnect in database:", err);
        }

        setConnectedDevice(null);
      }
    );

    disconnectSubscriptionRef.current = subscription;

    // Cleanup: remove the subscription when component unmounts or device changes
    return () => {
      subscription?.remove();
    };
  }, [connectedDevice, user]);

  const refreshHistory = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    try {
      const readings = await getVitalReadings(user.id);
      setHistory(readings as VitalReading[]);
    } catch (err) {
      console.error("Failed to refresh BLE history:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const addManualReading = useCallback(
    async (systolic: number, diastolic: number, heartRate: number) => {
      const reading: VitalReading = {
        systolic,
        diastolic,
        heartRate,
        timestamp: new Date(),
        source: "manual",
      };
      await processNewReading(reading);
    },
    [processNewReading]
  );

  return {
    isScanning,
    isMeasuring,
    connectedDevice,
    discoveredDevices,
    lastReading,
    history,
    isLoading,
    startScan,
    stopScan,
    connectDevice,
    disconnectDevice,
    startMeasurement,
    stopMeasurement,
    addManualReading,
    refreshHistory,
  };
});
