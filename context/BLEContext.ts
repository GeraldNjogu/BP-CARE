import createContextHook from "@nkzw/create-context-hook";
import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { saveVitalReading, getVitalReadings } from "@/services/readings";
import {
  saveDevice,
  disconnectDevice as disconnectDeviceDB,
} from "@/services/devices";
import { createNotification } from "@/services/notifications";
import {
  computePrediction,
  computeXAIInsights,
  createPrediction,
  createXAIInsight,
} from "@/services/predictions";
import { BleManager } from "react-native-ble-plx";
import { PermissionsAndroid, Platform, Alert } from "react-native";
import { HryfineSession, isHryfineDevice } from "@/services/hryfine/HryfineSession";
import { GATT } from "@/services/hryfine/constants";

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
  startHeartRateMeasurement: () => void;
  stopMeasurement: () => void;
  addManualReading: (systolic: number, diastolic: number, heartRate: number) => Promise<void>;
  refreshHistory: () => Promise<void>;
};

const bleManager = new BleManager();

const SCAN_SERVICE_UUIDS: string[] | null = null;

export const [BLEProvider, useBLE] = createContextHook(() => {
  const { user } = useAuth();

  const [isScanning, setIsScanning] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<BLEDevice | null>(null);
  const [discoveredDevices, setDiscoveredDevices] = useState<BLEDevice[]>([]);
  const [lastReading, setLastReading] = useState<VitalReading | null>(null);
  const [history, setHistory] = useState<VitalReading[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const disconnectSubscriptionRef = useRef<ReturnType<BleManager["onDeviceDisconnected"]> | null>(null);
  const hryfineSessionRef = useRef<HryfineSession | null>(null);
  const checkBluetoothEnabled = async () => {
    try {
      if (Platform.OS === "android") {
        const permissions = [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
        if (Platform.Version >= 31) {
          permissions.push(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
          );
        }
        const results = await PermissionsAndroid.requestMultiple(permissions);
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

  const processNewReading = useCallback(
    async (reading: VitalReading) => {
      setLastReading(reading);
      setHistory((prev) => [reading, ...prev]);

      if (!user) {
        console.warn("No authenticated user — reading kept locally only.");
        return;
      }

      let savedReadingRow = null;
      try {
        savedReadingRow = await saveVitalReading(user.id, reading);
      } catch (err) {
        console.error("Failed to save vital reading:", err);
        return;
      }

      try {
        const prediction = computePrediction(reading);
        await createPrediction(user.id, savedReadingRow.id, prediction);

        const xaiInsights = computeXAIInsights(reading);
        for (const insight of xaiInsights) {
          await createXAIInsight(user.id, savedReadingRow.id, insight);
        }

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
      } catch (auxErr) {
        console.warn("Secondary analytics failed:", auxErr);
      }
    },
    [user]
  );

  const handleWatchVital = useCallback(
    (vital: { systolic: number; diastolic: number; heartRate: number }) => {
      if (vital.systolic > 0 && vital.diastolic > 0) {
        const reading: VitalReading = {
          systolic: vital.systolic,
          diastolic: vital.diastolic,
          heartRate: vital.heartRate,
          timestamp: new Date(),
          source: "ble",
        };
        processNewReading(reading);
        setIsMeasuring(false);
        return;
      }

      if (vital.heartRate > 0) {
        setLastReading((prev) => {
          const reading: VitalReading = {
            systolic: prev?.systolic ?? 0,
            diastolic: prev?.diastolic ?? 0,
            heartRate: vital.heartRate,
            timestamp: new Date(),
            source: "ble",
          };
          if (prev?.systolic && prev?.diastolic) {
            processNewReading(reading);
          }
          return reading;
        });
        setIsMeasuring(false);
      }
    },
    [processNewReading]
  );

  const startScan = useCallback(async () => {
    try {
      const granted = await checkBluetoothEnabled();
      if (!granted) {
        Alert.alert(
          "Bluetooth Permission Required",
          "Please enable location and Bluetooth permissions to scan for devices.",
          [{ text: "OK" }]
        );
        return;
      }

      setIsScanning(true);
      setDiscoveredDevices([]);

      bleManager.startDeviceScan(SCAN_SERVICE_UUIDS, null, (error, device) => {
        if (error) {
          console.error("BLE scan error:", error);
          setIsScanning(false);
          bleManager.stopDeviceScan();
          return;
        }
        if (!device) {
          return;
        }

        const displayName = device.name || device.localName || "watch";
        const serviceUuids = (device.serviceUUIDs || []).join(", ");
        const isCompatible = isHryfineDevice(device);

        console.debug("BLE scan device:", {
          id: device.id,
          name: displayName,
          rssi: device.rssi,
          serviceUUIDs: serviceUuids,
          matchesHryfine: isCompatible,
        });

        if (!isCompatible) {
          return;
        }
        setDiscoveredDevices((prev) => {
          if (prev.some((d) => d.id === device.id)) {
            return prev;
          }
          return [
            ...prev,
            {
              id: device.id,
              name: displayName,
              rssi: device.rssi || -100,
              connected: false,
            },
          ];
        });
      });

      setTimeout(() => {
        bleManager.stopDeviceScan();
        setIsScanning(false);
        setDiscoveredDevices((devices) => {
          if (devices.length === 0) {
            Alert.alert(
              "No Devices Found",
              "No compatible watches were found. Ensure your watch is on and nearby.",
              [{ text: "OK" }]
            );
          }
          return devices;
        });
      }, 10000);
    } catch (err) {
      console.error("Failed to start BLE scan:", err);
      setIsScanning(false);
    }
  }, []);

  const stopScan = useCallback(() => {
    bleManager.stopDeviceScan();
    setIsScanning(false);
  }, []);

  const connectDevice = useCallback(
    async (id: string) => {
      try {
        const granted = await checkBluetoothEnabled();
        if (!granted) {
          return;
        }

        hryfineSessionRef.current?.dispose();
        hryfineSessionRef.current = null;

        const device = await bleManager.connectToDevice(id);
        const session = new HryfineSession(device, {
          onVital: handleWatchVital,
          onLog: (message, data) => console.log(`[Hryfine] ${message}`, data ?? ""),
        });

        await session.setup();
        await session.sendBindHandshake();

        hryfineSessionRef.current = session;

        const connected: BLEDevice = {
          id: device.id,
          name: device.name || "watch",
          rssi: device.rssi || -70,
          connected: true,
        };

        setConnectedDevice(connected);

        if (user) {
          await saveDevice(user.id, connected).catch(console.error);
        }

        Alert.alert("Device Connected", `Connected to ${connected.name}`, [{ text: "OK" }]);
      } catch (err) {
        console.error("Failed to connect:", err);
        Alert.alert("Connection Failed", "Could not connect to the watch. Please try again.", [
          { text: "OK" },
        ]);
      }
    },
    [handleWatchVital, user]
  );

  const disconnectDevice = useCallback(async () => {
    hryfineSessionRef.current?.dispose();
    hryfineSessionRef.current = null;

    if (connectedDevice) {
      try {
        await bleManager.cancelDeviceConnection(connectedDevice.id);
      } catch (err) {
        console.error("Error disconnecting:", err);
      }
    }

    if (user && connectedDevice) {
      await disconnectDeviceDB(user.id, connectedDevice.id).catch(console.error);
    }

    disconnectSubscriptionRef.current?.remove();
    disconnectSubscriptionRef.current = null;

    const name = connectedDevice?.name;
    setConnectedDevice(null);
    Alert.alert("Device Disconnected", name ? `${name} disconnected.` : "Watch disconnected.", [
      { text: "OK" },
    ]);
  }, [user, connectedDevice]);

  const startMeasurement = useCallback(async () => {
    if (!connectedDevice || !hryfineSessionRef.current) {
      Alert.alert("No Device Connected", "Connect your watch before measuring.", [{ text: "OK" }]);
      return;
    }

    setIsMeasuring(true);

    try {
      const session = hryfineSessionRef.current;
      await session.startBloodPressureMeasurement();

      const result = await session.waitForBloodPressureResult(90000);
      if (!result) {
        throw new Error("Timed out waiting for blood pressure result");
      }

      await processNewReading({
        systolic: result.systolic,
        diastolic: result.diastolic,
        heartRate: result.heartRate,
        timestamp: new Date(),
        source: "ble",
      });
    } catch (err) {
      console.error("Measurement failed:", err);
      if (user) {
        await createNotification(user.id, {
          title: "Measurement Failed",
          body: "No reading received from the watch. Try measuring from the watch face or retry.",
          type: "device",
        }).catch(() => {});
      }
      Alert.alert(
        "Measurement Failed",
        "Could not get a reading. You can also start BP on the watch — BPCare will capture it automatically.",
        [{ text: "OK" }]
      );
    } finally {
      setIsMeasuring(false);
    }
  }, [connectedDevice, processNewReading, user]);

  const startHeartRateMeasurement = useCallback(async () => {
    if (!connectedDevice || !hryfineSessionRef.current) {
      Alert.alert("No Device Connected", "Connect your watch before measuring.", [{ text: "OK" }]);
      return;
    }

    setIsMeasuring(true);

    try {
      const session = hryfineSessionRef.current;
      await session.startHeartRateMeasurement();

      const result = await session.waitForHeartRateResult(60000);
      if (!result) {
        throw new Error("Timed out waiting for heart rate result");
      }

      setLastReading((prev) => ({
        systolic: prev?.systolic ?? 0,
        diastolic: prev?.diastolic ?? 0,
        heartRate: result.heartRate,
        timestamp: new Date(),
        source: "ble",
      }));
    } catch (err) {
      console.error("Heart rate measurement failed:", err);
      Alert.alert(
        "Measurement Failed",
        "Could not get heart rate from the watch. Try measuring from the watch face.",
        [{ text: "OK" }]
      );
    } finally {
      setIsMeasuring(false);
    }
  }, [connectedDevice]);

  const stopMeasurement = useCallback(() => {
    setIsMeasuring(false);
  }, []);

  useEffect(() => {
    if (!connectedDevice || !user) {
      return;
    }

    const subscription = bleManager.onDeviceDisconnected(connectedDevice.id, async () => {
      hryfineSessionRef.current?.dispose();
      hryfineSessionRef.current = null;

      Alert.alert("Device Disconnected", `${connectedDevice.name} has been disconnected.`, [
        { text: "OK" },
      ]);

      await disconnectDeviceDB(user.id, connectedDevice.id).catch(console.error);
      setConnectedDevice(null);
    });

    disconnectSubscriptionRef.current = subscription;
    return () => subscription.remove();
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
      console.error("Failed to refresh history:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const addManualReading = useCallback(
    async (systolic: number, diastolic: number, heartRate: number) => {
      await processNewReading({
        systolic,
        diastolic,
        heartRate,
        timestamp: new Date(),
        source: "manual",
      });
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
    startHeartRateMeasurement,
    stopMeasurement,
    addManualReading,
    refreshHistory,
  };
});
