import { supabase } from "@/lib/supabase";
import { BLEDevice } from "@/context/BLEContext";

export async function getConnectedDevices(userId: string): Promise<BLEDevice[]> {
  const { data, error } = await (supabase
    .from("connected_devices") as any)
    .select("*")
    .eq("user_id", userId)
    .eq("connected", true);

  if (error) throw error;

  return (data || []).map((d: any) => ({
    id: d.device_id,
    name: d.name,
    rssi: d.rssi || -70,
    connected: d.connected,
  }));
}

export async function saveDevice(userId: string, device: BLEDevice) {
  const { error } = await (supabase.from("connected_devices") as any).upsert(
    {
      user_id: userId,
      device_id: device.id,
      name: device.name,
      connected: device.connected,
      rssi: device.rssi,
      last_connected: new Date().toISOString(),
    },
    { onConflict: "user_id,device_id" }
  );

  if (error) throw error;
}

export async function disconnectDevice(userId: string, deviceId: string) {
  const { error } = await (supabase
    .from("connected_devices") as any)
    .update({ connected: false, last_connected: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("device_id", deviceId);

  if (error) throw error;
}
