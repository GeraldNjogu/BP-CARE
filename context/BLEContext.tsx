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

const mockDevices: BLEDevice[] = [
  { id: "watch-1", name: "Apple Watch Ultra", rssi: -55, connected: false },
  { id: "watch-2", name: "Galaxy Watch 6", rssi: -72, connected: false },
  { id: "watch-3", name: "Fitbit Sense 2", rssi: -68, connected: false },
];

export const [BLEProvider, useBLE] = createContextHook((): BLEState => {
  const { user, isAuthenticated } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<BLEDevice | null>(null);
  const [discoveredDevices, setDiscoveredDevices] = useState<BLEDevice[]>([]);
  const [lastReading, setLastReading] = useState<VitalReading | null>(null);
  const [history, setHistory] = useState<VitalReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const measureInterval = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const startScan = useCallback(() => {
    setIsScanning(true);
    setDiscoveredDevices([]);
    setTimeout(() => {
      setDiscoveredDevices(mockDevices);
      setIsScanning(false);
    }, 2500);
  }, []);

  const stopScan = useCallback(() => {
    setIsScanning(false);
  }, []);

  const connectDevice = useCallback(
    async (id: string) => {
      const device = mockDevices.find((d) => d.id === id);
      if (device) {
        const connected = { ...device, connected: true };
        setConnectedDevice(connected);
        if (user) {
          try {
            await saveDevice(user.id, connected);
          } catch (err) {
            console.error("Failed to save device:", err);
          }
        }
      }
    },
    [user]
  );

  const disconnectDevice = useCallback(async () => {
    if (user && connectedDevice) {
      try {
        await disconnectDeviceDB(user.id, connectedDevice.id);
      } catch (err) {
        console.error("Failed to disconnect device:", err);
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

  const startMeasurement = useCallback(() => {
    setIsMeasuring(true);
    let progress = 0;
    measureInterval.current = setInterval(() => {
      progress += 1;
      if (progress >= 5) {
        if (measureInterval.current) clearInterval(measureInterval.current);
        const reading: VitalReading = {
          systolic: Math.floor(125 + Math.random() * 25),
          diastolic: Math.floor(78 + Math.random() * 18),
          heartRate: Math.floor(62 + Math.random() * 20),
          timestamp: new Date(),
          source: "ble",
        };
        processNewReading(reading);
        setIsMeasuring(false);
      }
    }, 1000);
  }, [processNewReading]);

  const stopMeasurement = useCallback(() => {
    if (measureInterval.current) clearInterval(measureInterval.current);
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
