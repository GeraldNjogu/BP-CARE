import { supabase } from "@/lib/supabase";
import { VitalReading } from "@/context/BLEContext";

export type SavedVitalReading = VitalReading & { id: string };

export async function saveVitalReading(
  userId: string,
  reading: Omit<VitalReading, "timestamp"> & { timestamp?: Date }
): Promise<SavedVitalReading> {
  const { data, error } = await (supabase
    .from("vital_readings") as any)
    .insert({
      user_id: userId,
      systolic: reading.systolic,
      diastolic: reading.diastolic,
      heart_rate: reading.heartRate,
      source: reading.source,
      timestamp: reading.timestamp?.toISOString() || new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) throw error || new Error("Failed to save reading");

  return {
    id: data.id,
    systolic: data.systolic,
    diastolic: data.diastolic,
    heartRate: data.heart_rate,
    source: data.source,
    timestamp: new Date(data.timestamp),
  };
}

export async function getVitalReadings(
  userId: string,
  limit = 100
): Promise<VitalReading[]> {
  const { data, error } = await (supabase
    .from("vital_readings") as any)
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((r: any) => ({
    systolic: r.systolic,
    diastolic: r.diastolic,
    heartRate: r.heart_rate,
    source: r.source,
    timestamp: new Date(r.timestamp),
  }));
}

export async function getReadingsByDateRange(
  userId: string,
  start: Date,
  end: Date
): Promise<VitalReading[]> {
  const { data, error } = await (supabase
    .from("vital_readings") as any)
    .select("*")
    .eq("user_id", userId)
    .gte("timestamp", start.toISOString())
    .lte("timestamp", end.toISOString())
    .order("timestamp", { ascending: true });

  if (error) throw error;

  return (data || []).map((r: any) => ({
    systolic: r.systolic,
    diastolic: r.diastolic,
    heartRate: r.heart_rate,
    source: r.source,
    timestamp: new Date(r.timestamp),
  }));
}

export async function getLatestReading(userId: string): Promise<VitalReading | null> {
  const { data, error } = await (supabase
    .from("vital_readings") as any) 
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    systolic: data.systolic,
    diastolic: data.diastolic,
    heartRate: data.heart_rate,
    source: data.source,
    timestamp: new Date(data.timestamp),
  };
}

export async function getAverageReadings(userId: string, days = 7) {
  const start = new Date();
  start.setDate(start.getDate() - days);

  const { data, error } = await (supabase
    .from("vital_readings") as any)
    .select("systolic, diastolic, heart_rate")
    .eq("user_id", userId)
    .gte("timestamp", start.toISOString());

  if (error || !data || data.length === 0) {
    return { systolic: 0, diastolic: 0, heartRate: 0, count: 0 };
  }

  const systolic = Math.round(data.reduce((a: any, b: { systolic: any; }) => a + b.systolic, 0) / data.length);
  const diastolic = Math.round(data.reduce((a: any, b: { diastolic: any; }) => a + b.diastolic, 0) / data.length);
  const heartRate = Math.round(data.reduce((a: any, b: { heart_rate: any; }) => a + b.heart_rate, 0) / data.length);

  return { systolic, diastolic, heartRate, count: data.length };
}
