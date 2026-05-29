import createContextHook from "@nkzw/create-context-hook";
import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {supabase} from "@/lib/supabase";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/services/notifications";

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: "medication" | "alert" | "recommendation" | "device" | "appointment";
  read: boolean;
  timestamp: Date;
};

type NotificationState = {
  items: NotificationItem[];
  isLoading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
  unreadCount: number;
};

export const [NotificationProvider, useNotifications] = createContextHook((): NotificationState => {
  const { user, isAuthenticated } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const notifications = await getNotifications(user.id);
      setItems(notifications);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
  if (!isAuthenticated || !user) {
    setItems([]);
    setIsLoading(false);
    return;
  }

  // 1. Initial Load of notifications
  loadNotifications();

  // 2. Setup Real-time Subscription channel
  const channel = supabase
    .channel(`public:notifications:user_id=eq.${user.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        const newNotif: NotificationItem = {
          id: payload.new.id,
          title: payload.new.title,
          body: payload.new.body,
          type: payload.new.type,
          read: payload.new.read,
          timestamp: new Date(payload.new.timestamp),
        };

        // Prepend the new notification to the top of the state array
        setItems((prev) => [newNotif, ...prev]);
      }
    )
    .subscribe();

  // 3. Clean up the subscription channel when component unmounts or user changes
  return () => {
    supabase.removeChannel(channel);
  };
}, [isAuthenticated, user, loadNotifications]);

  const markRead = useCallback(
    async (id: string) => {
      if (!user) return;
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      try {
        await markNotificationRead(user.id, id);
      } catch (err) {
        console.error("Failed to mark read:", err);
      }
    },
    [user]
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead(user.id);
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  }, [user]);

  const unreadCount = items.filter((n) => !n.read).length;

  return { items, isLoading, markRead, markAllRead, refresh: loadNotifications, unreadCount };
});
