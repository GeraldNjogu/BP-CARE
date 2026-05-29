import { supabase } from "@/lib/supabase";

export type UserSettings = {
  darkMode: boolean;
  notificationsEnabled: boolean;
  medicationReminders: boolean;
  bpAlerts: boolean;
  language: string;
  medicationReminderTimes: string[];
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
    medicationReminderTimes: data.medication_reminder_times || [],
  };
}

export async function updateSettings(userId: string, settings: Partial<UserSettings>) {
  const dbUpdates: Record<string, unknown> = {
    user_id: userId, // Ensure user_id is explicitly passed for the creation fallback case
  };
  
  if (settings.darkMode !== undefined) dbUpdates.dark_mode = settings.darkMode;
  if (settings.notificationsEnabled !== undefined) dbUpdates.notifications_enabled = settings.notificationsEnabled;
  if (settings.medicationReminders !== undefined) dbUpdates.medication_reminders = settings.medicationReminders;
  if (settings.bpAlerts !== undefined) dbUpdates.bp_alerts = settings.bpAlerts;
  if (settings.language !== undefined) dbUpdates.language = settings.language;
  if (settings.medicationReminderTimes !== undefined) dbUpdates.medication_reminder_times = settings.medicationReminderTimes;
  dbUpdates.updated_at = new Date().toISOString();

  // FIX: Change .update() to .upsert() so missing rows get created automatically
  const { error } = await (supabase
    .from("user_settings") as any)
    .upsert(dbUpdates, { onConflict: 'user_id' }); // Uses user_id unique constraint to match rows

  if (error) {
    console.error("Error upserting user settings row:", error);
    throw error;
  }
}