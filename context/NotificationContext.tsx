import createContextHook from "@nkzw/create-context-hook";
import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
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
    if (isAuthenticated && user) {
      loadNotifications();
    } else {
      setItems([]);
      setIsLoading(false);
    }
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
