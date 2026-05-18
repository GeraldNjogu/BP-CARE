import { supabase } from "@/lib/supabase";
import { NotificationItem } from "@/context/NotificationContext";

export async function getNotifications(userId: string): Promise<NotificationItem[]> {
  const { data, error } = await (supabase
    .from("notifications") as any)
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false });

  if (error) throw error;

  return (data || []).map((n: any) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    type: n.type,
    read: n.read,
    timestamp: new Date(n.timestamp),
  }));
}

export async function createNotification(
  userId: string,
  notification: Omit<NotificationItem, "id" | "timestamp" | "read">
): Promise<NotificationItem> {
  const { data, error } = await (supabase
    .from("notifications") as any)
    .insert({
      user_id: userId,
      title: notification.title,
      body: notification.body,
      type: notification.type,
      read: false,
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) throw error || new Error("Failed to create notification");

  return {
    id: data.id,
    title: data.title,
    body: data.body,
    type: data.type,
    read: data.read,
    timestamp: new Date(data.timestamp),
  };
}

export async function markNotificationRead(userId: string, id: string) {
  const { error } = await (supabase
    .from("notifications") as any)
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await (supabase
    .from("notifications") as any)
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) throw error;
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await (supabase
    .from("notifications") as any)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) throw error;
  return count || 0;
}
