import { VitalReading } from "@/context/BLEContext";

/**
 * BP filtering configuration
 */
export interface BPFilterConfig {
  // Physiological plausibility bounds
  minSystolic: number;
  maxSystolic: number;
  minDiastolic: number;
  maxDiastolic: number;
  minHeartRate: number;
  maxHeartRate: number;

  // Pulse pressure validation (systolic - diastolic)
  minPulsePressure: number;
  maxPulsePressure: number;

  // Rate of change validation
  maxSystolicChangePerMinute: number;
  maxDiastolicChangePerMinute: number;

  // Median filter window size
  medianWindowSize: number;
}

/**
 * Default BP filter configuration
 * Based on medical standards for abnormal BP detection
 */
export const DEFAULT_BP_FILTER_CONFIG: BPFilterConfig = {
  minSystolic: 70,
  maxSystolic: 250,
  minDiastolic: 40,
  maxDiastolic: 160,
  minHeartRate: 40,
  maxHeartRate: 180,
  minPulsePressure: 20,
  maxPulsePressure: 120,
  maxSystolicChangePerMinute: 30,
  maxDiastolicChangePerMinute: 20,
  medianWindowSize: 3,
};

/**
 * Filtering result
 */
export interface FilteredReading {
  original: VitalReading;
  isValid: boolean;
  reason?: string;
  filtered?: VitalReading;
}

/**
 * Check if BP reading is within physiological plausibility bounds
 */
function isPhysiologicallyPlausible(
  reading: VitalReading,
  config: BPFilterConfig
): { valid: boolean; reason?: string } {
  const { systolic, diastolic, heartRate } = reading;

  // Check systolic range
  if (systolic < config.minSystolic || systolic > config.maxSystolic) {
    return { valid: false, reason: `Systolic ${systolic} outside range [${config.minSystolic}-${config.maxSystolic}]` };
  }

  // Check diastolic range
  if (diastolic < config.minDiastolic || diastolic > config.maxDiastolic) {
    return { valid: false, reason: `Diastolic ${diastolic} outside range [${config.minDiastolic}-${config.maxDiastolic}]` };
  }

  // Check heart rate range
  if (heartRate < config.minHeartRate || heartRate > config.maxHeartRate) {
    return { valid: false, reason: `Heart rate ${heartRate} outside range [${config.minHeartRate}-${config.maxHeartRate}]` };
  }

  // Check pulse pressure (systolic - diastolic)
  const pulsePressure = systolic - diastolic;
  if (pulsePressure < config.minPulsePressure || pulsePressure > config.maxPulsePressure) {
    return { valid: false, reason: `Pulse pressure ${pulsePressure} outside range [${config.minPulsePressure}-${config.maxPulsePressure}]` };
  }

  // Check that systolic >= diastolic (always true if above passed)
  if (systolic < diastolic) {
    return { valid: false, reason: "Systolic < Diastolic (invalid)" };
  }

  return { valid: true };
}

/**
 * Check if reading has plausible rate of change from previous reading
 */
function isRateOfChangePlausible(
  current: VitalReading,
  previous: VitalReading | null,
  config: BPFilterConfig
): { valid: boolean; reason?: string } {
  if (!previous) {
    return { valid: true }; // No previous to compare
  }

  // Calculate time difference in minutes
  const timeDiffMs = current.timestamp.getTime() - previous.timestamp.getTime();
  const timeDiffMinutes = timeDiffMs / 60000;

  if (timeDiffMinutes <= 0) {
    return { valid: true }; // Same timestamp or clock skew, skip check
  }

  // Calculate rate of change per minute
  const sysDelta = Math.abs(current.systolic - previous.systolic);
  const diasDelta = Math.abs(current.diastolic - previous.diastolic);

  const sysChangePerMin = sysDelta / timeDiffMinutes;
  const diasChangePerMin = diasDelta / timeDiffMinutes;

  // Check systolic change rate
  if (sysChangePerMin > config.maxSystolicChangePerMinute) {
    return {
      valid: false,
      reason: `Systolic changed ${sysChangePerMin.toFixed(1)} mmHg/min (max ${config.maxSystolicChangePerMinute})`,
    };
  }

  // Check diastolic change rate
  if (diasChangePerMin > config.maxDiastolicChangePerMinute) {
    return {
      valid: false,
      reason: `Diastolic changed ${diasChangePerMin.toFixed(1)} mmHg/min (max ${config.maxDiastolicChangePerMinute})`,
    };
  }

  return { valid: true };
}

/**
 * Median filter: smooth values using median of surrounding readings
 */
function medianFilter(readings: VitalReading[], windowSize: number): VitalReading[] {
  if (readings.length < windowSize) {
    return readings;
  }

  return readings.map((reading, idx) => {
    const start = Math.max(0, idx - Math.floor(windowSize / 2));
    const end = Math.min(readings.length - 1, idx + Math.floor(windowSize / 2));
    const window = readings.slice(start, end + 1);

    const systolics = window.map((r) => r.systolic).sort((a, b) => a - b);
    const diastolics = window.map((r) => r.diastolic).sort((a, b) => a - b);
    const heartRates = window.map((r) => r.heartRate).sort((a, b) => a - b);

    const medianValue = (arr: number[]) => {
      const mid = Math.floor(arr.length / 2);
      return arr.length % 2 !== 0 ? arr[mid] : Math.round((arr[mid - 1] + arr[mid]) / 2);
    };

    return {
      systolic: medianValue(systolics),
      diastolic: medianValue(diastolics),
      heartRate: medianValue(heartRates),
      timestamp: reading.timestamp,
      source: reading.source,
    };
  });
}

/**
 * Filter a single BP reading for abnormalities
 *
 * @param reading - The vital reading to filter
 * @param config - Filter configuration (uses default if not provided)
 * @param previousReading - Previous reading for rate-of-change check (optional)
 * @returns FilteredReading with validity status and reason
 */
export function filterBPReading(
  reading: VitalReading,
  config: BPFilterConfig = DEFAULT_BP_FILTER_CONFIG,
  previousReading: VitalReading | null = null
): FilteredReading {
  // Check physiological plausibility
  const plausibilityCheck = isPhysiologicallyPlausible(reading, config);
  if (!plausibilityCheck.valid) {
    return {
      original: reading,
      isValid: false,
      reason: plausibilityCheck.reason,
    };
  }

  // Check rate of change (if previous reading exists)
  const rateCheck = isRateOfChangePlausible(reading, previousReading, config);
  if (!rateCheck.valid) {
    return {
      original: reading,
      isValid: false,
      reason: rateCheck.reason,
    };
  }

  return {
    original: reading,
    isValid: true,
  };
}

/**
 * Filter a batch of BP readings
 * Applies rule-based checks, then median smoothing, then re-validates
 *
 * @param readings - Array of vital readings (should be sorted by timestamp)
 * @param config - Filter configuration (uses default if not provided)
 * @returns Array of FilteredReading results
 */
export function filterBPReadings(
  readings: VitalReading[],
  config: BPFilterConfig = DEFAULT_BP_FILTER_CONFIG
): FilteredReading[] {
  if (readings.length === 0) {
    return [];
  }

  // Step 1: Initial rule-based filtering
  const ruleFiltered: FilteredReading[] = readings.map((reading, idx) => {
    const previousReading = idx > 0 ? readings[idx - 1] : null;
    return filterBPReading(reading, config, previousReading);
  });

  // Step 2: Extract valid readings for median filtering
  const validReadings = ruleFiltered
    .filter((result) => result.isValid)
    .map((result) => result.original);

  if (validReadings.length === 0) {
    return ruleFiltered; // Return original results if no valid readings
  }

  // Step 3: Apply median filter to smooth valid readings
  const smoothedReadings = medianFilter(validReadings, config.medianWindowSize);

  // Step 4: Re-validate smoothed readings
  const reValidated: FilteredReading[] = smoothedReadings.map((smoothed, idx) => {
    const previousSmoothed = idx > 0 ? smoothedReadings[idx - 1] : null;
    const check = filterBPReading(smoothed, config, previousSmoothed);

    return {
      original: validReadings[idx],
      isValid: check.isValid,
      reason: check.reason,
      filtered: check.isValid ? smoothed : undefined,
    };
  });

  return reValidated;
}

/**
 * Get summary statistics on filter results
 */
export function getFilterSummary(results: FilteredReading[]) {
  const totalReadings = results.length;
  const validReadings = results.filter((r) => r.isValid).length;
  const invalidReadings = totalReadings - validReadings;
  const rejectionRate = totalReadings > 0 ? ((invalidReadings / totalReadings) * 100).toFixed(2) : "0.00";

  const reasonCounts: Record<string, number> = {};
  results.forEach((r) => {
    if (!r.isValid && r.reason) {
      reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1;
    }
  });

  return {
    totalReadings,
    validReadings,
    invalidReadings,
    rejectionRate: `${rejectionRate}%`,
    rejectionReasons: reasonCounts,
  };
}
