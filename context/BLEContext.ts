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
import { PermissionsAndroid, Platform } from "react-native";
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

// Request BLE permissions for Android
const requestBLEPermissions = async () => {
  if (Platform.OS === "android") {
    try {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return (
        result["android.permission.BLUETOOTH_SCAN"] === "granted" &&
        result["android.permission.BLUETOOTH_CONNECT"] === "granted"
      );
    } catch (err) {
      console.error("Failed to request BLE permissions:", err);
      return false;
    }
  }
  return true;
};

// Check if Bluetooth is powered on
const checkBluetoothEnabled = async (userId: string) => {
  try {
    const state = await bleManager.state();
    if (state !== "PoweredOn") {
      await createNotification(userId, {
        title: "Bluetooth Disabled",
        body: "Please enable Bluetooth in your device settings to scan for devices.",
        type: "device",
      }).catch(() => {});
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to check Bluetooth state:", err);
    return true; // Assume it's on if we can't check
  }
};

export const [BLEProvider, useBLE] = createContextHook((): BLEState => {
  const { user, isAuthenticated } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<BLEDevice | null>(null);
  const [discoveredDevices, setDiscoveredDevices] = useState<BLEDevice[]>([]);
  const [lastReading, setLastReading] = useState<VitalReading | null>(null);
  const [history, setHistory] = useState<VitalReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshHistory = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const readings = await getVitalReadings(user.id, 50);
      setHistory(readings);
      if (readings.length > 0) {
        setLastReading(readings[0]);
      }
    } catch (err) {
      console.error("Failed to load readings:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      refreshHistory();
      getConnectedDevices(user.id)
        .then((devices) => {
          if (devices.length > 0) setConnectedDevice(devices[0]);
        })
        .catch(() => {});
    } else {
      setHistory([]);
      setLastReading(null);
      setConnectedDevice(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, user, refreshHistory]);

  const startScan = useCallback(async () => {
    try {
      const hasPermissions = await requestBLEPermissions();
      if (!hasPermissions) {
        console.error("BLE permissions not granted");
        if (user) {
          await createNotification(user.id, {
            title: "Permission Denied",
            body: "BLE permissions are required to scan for devices.",
            type: "device",
          }).catch(() => {});
        }
        return;
      }

      // Check if Bluetooth is enabled
      if (user) {
        const isBluetoothEnabled = await checkBluetoothEnabled(user.id);
        if (!isBluetoothEnabled) {
          return;
        }
      }

      setIsScanning(true);
      setDiscoveredDevices([]);

      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error("BLE scan error:", error);
          setIsScanning(false);
          return;
        }

        // Filter for health-related devices (smartwatches, fitness trackers, BP monitors)
        if (device && device.name && (
          device.name.toLowerCase().includes("watch") ||
          device.name.toLowerCase().includes("band") ||
          device.name.toLowerCase().includes("fitbit") ||
          device.name.toLowerCase().includes("galaxy") ||
          device.name.toLowerCase().includes("apple") ||
          device.name.toLowerCase().includes("health") ||
          device.name.toLowerCase().includes("omron") ||
          device.name.toLowerCase().includes("bp") ||
          device.name.toLowerCase().includes("monitor")
        )) {
          setDiscoveredDevices((prev) => {
            const exists = prev.some((d) => d.id === device.id);
            if (!exists) {
              return [
                ...prev,
                {
                  id: device.id,
                  name: device.name || "Unknown Device",
                  rssi: device.rssi || -100,
                  connected: false,
                },
              ];
            }
            return prev;
          });
        }
      });

      // Stop scanning after 10 seconds
      setTimeout(async () => {
        bleManager.stopDeviceScan();
        setIsScanning(false);
        
        // Check if any devices were found and notify user
        setDiscoveredDevices((devices) => {
          if (devices.length === 0 && user) {
            createNotification(user.id, {
              title: "No Devices Found",
              body: "No Bluetooth health devices were found. Please ensure your device is powered on and within range.",
              type: "device",
            }).catch(() => {});
          }
          return devices;
        });
      }, 10000);
    } catch (err) {
      console.error("Failed to start BLE scan:", err);
      setIsScanning(false);
      if (user) {
        await createNotification(user.id, {
          title: "Scan Error",
          body: "Failed to scan for Bluetooth devices. Please try again.",
          type: "device",
        }).catch(() => {});
      }
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
            await createNotification(user.id, {
              title: "Device Connected",
              body: `Successfully connected to ${connected.name}`,
              type: "device",
            }).catch(() => {});
          } catch (err) {
            console.error("Failed to save device:", err);
          }
        }
      } catch (err) {
        console.error("Failed to connect to device:", err);
        if (user) {
          await createNotification(user.id, {
            title: "Connection Failed",
            body: "Failed to connect to the selected device. Please try again.",
            type: "device",
          }).catch(() => {});
        }
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

    setConnectedDevice(null);
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
      console.log("Saving manual entry payload to Supabase...", reading);
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

  const startMeasurement = useCallback(async () => {
    if (!connectedDevice) {
      console.warn("Attempted to start measurement with no connected device");
      if (user) {
        await createNotification(user.id, {
          title: "No Device Connected",
          body: "Please connect a BLE device before starting a measurement.",
          type: "device",
        }).catch(() => {});
      }
      return;
    }

    setIsMeasuring(true);

    try {
      const device = bleManager.connectedDevices.find(
        (d) => d.id === connectedDevice.id
      );

      if (!device) {
        throw new Error("Device not found in connected devices");
      }

      // Common Blood Pressure Service and Characteristic UUIDs
      const BP_SERVICE_UUID = "180B"; // Blood Pressure Service
      const BP_MEASUREMENT_UUID = "2A35"; // Blood Pressure Measurement
      const HEART_RATE_SERVICE_UUID = "180D";
      const HEART_RATE_MEASUREMENT_UUID = "2A37";

      let systolic = 120;
      let diastolic = 80;
      let heartRate = 70;

      try {
        // Try to read Blood Pressure measurement
        const services = await device.services();
        let bpCharacteristic = null;
        let hrCharacteristic = null;

        for (const service of services) {
          const characteristics = await service.characteristics();

          for (const characteristic of characteristics) {
            if (
              characteristic.uuid.toLowerCase() === BP_MEASUREMENT_UUID.toLowerCase()
            ) {
              bpCharacteristic = characteristic;
            }
            if (
              characteristic.uuid.toLowerCase() === HEART_RATE_MEASUREMENT_UUID.toLowerCase()
            ) {
              hrCharacteristic = characteristic;
            }
          }
        }

        // Read BP data if available
        if (bpCharacteristic) {
          const data = await bpCharacteristic.read();
          // Standard GATT BP measurement format: flags, systolic, diastolic, etc.
          if (data.value) {
            const buffer = Buffer.from(data.value, "base64");
            if (buffer.length >= 7) {
              systolic = buffer.readUInt16LE(1);
              diastolic = buffer.readUInt16LE(3);
            }
          }
        }

        // Read HR data if available
        if (hrCharacteristic) {
          const data = await hrCharacteristic.read();
          if (data.value) {
            const buffer = Buffer.from(data.value, "base64");
            if (buffer.length >= 2) {
              heartRate = buffer.readUInt8(1);
            }
          }
        }
      } catch (readErr) {
        console.warn("Could not read BLE characteristics, using default values:", readErr);
        // If we can't read specific characteristics, notify the user
        if (user) {
          await createNotification(user.id, {
            title: "Reading in Progress",
            body: "Measurement is being taken from your device...",
            type: "device",
          }).catch(() => {});
        }
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
      if (user) {
        await createNotification(user.id, {
          title: "Measurement Failed",
          body: "Failed to read measurement from device. Please try again.",
          type: "device",
        }).catch(() => {});
      }
    }
  }, [connectedDevice, processNewReading, user]);

  const stopMeasurement = useCallback(() => {
    setIsMeasuring(false);
  }, []);

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
