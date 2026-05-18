import { supabase } from "@/lib/supabase";

export type UserSettings = {
  darkMode: boolean;
  notificationsEnabled: boolean;
  medicationReminders: boolean;
  bpAlerts: boolean;
  language: string;
};

export async function getSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await (supabase
    .from("user_settings") as any)
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;

  return {
    darkMode: data.dark_mode,
    notificationsEnabled: data.notifications_enabled,
    medicationReminders: data.medication_reminders,
    bpAlerts: data.bp_alerts,
    language: data.language,
  };
}

export async function updateSettings(userId: string, settings: Partial<UserSettings>) {
  const dbUpdates: Record<string, unknown> = {};
  if (settings.darkMode !== undefined) dbUpdates.dark_mode = settings.darkMode;
  if (settings.notificationsEnabled !== undefined) dbUpdates.notifications_enabled = settings.notificationsEnabled;
  if (settings.medicationReminders !== undefined) dbUpdates.medication_reminders = settings.medicationReminders;
  if (settings.bpAlerts !== undefined) dbUpdates.bp_alerts = settings.bpAlerts;
  if (settings.language !== undefined) dbUpdates.language = settings.language;
  dbUpdates.updated_at = new Date().toISOString();

  const { error } = await (supabase
    .from("user_settings") as any)
    .update(dbUpdates)
    .eq("user_id", userId);

  if (error) throw error;
}
