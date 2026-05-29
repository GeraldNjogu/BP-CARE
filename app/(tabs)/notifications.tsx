import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useNotifications } from "@/context/NotificationContext";
import { useState } from "react";
import {
  Bell,
  Pill,
  AlertTriangle,
  Lightbulb,
  Bluetooth,
  Calendar,
  Check,
  Trash2,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";
import Chatbot from "@/components/Chatbot";

const typeConfig = {
  medication: { icon: Pill, color: "#3B82F6", bg: "#3B82F612" },
  alert: { icon: AlertTriangle, color: "#EF4444", bg: "#EF444412" },
  recommendation: { icon: Lightbulb, color: "#F59E0B", bg: "#F59E0B12" },
  device: { icon: Bluetooth, color: "#0D7377", bg: "#0D737712" },
  appointment: { icon: Calendar, color: "#8B5CF6", bg: "#8B5CF612" },
};

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { items, markRead, markAllRead, unreadCount } = useNotifications();
  
  // Track the active filter tab
  const [activeFilter, setActiveFilter] = useState<"All" | "Alerts" | "Medication" | "Insights">("All");

  const sortedItems = [...items].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  // Filter items matching the backend types
  const filteredItems = sortedItems.filter((item) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Alerts") return item.type === "alert";
    if (activeFilter === "Medication") return item.type === "medication";
    if (activeFilter === "Insights") return item.type === "recommendation";
    return true;
  });

  const timeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            paddingTop: 60,
            paddingHorizontal: 20,
            paddingBottom: 16,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 28,
                fontWeight: "800",
                color: colors.text,
              }}
            >
              Notifications
            </Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>
              {unreadCount} unread
            </Text>
          </View>
          <TouchableOpacity onPress={markAllRead}>
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Check size={14} color="#fff" style={{ marginRight: 4 }} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: "#fff",
                }}
              >
                Mark All Read
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

       {/* Update the Filter Tabs Block */}
<View style={{ flexDirection: "row", paddingHorizontal: 20, marginBottom: 16, gap: 8 }}>
  {(["All", "Alerts", "Medication", "Insights"] as const).map((filter) => {
    const isActive = activeFilter === filter;
    return (
      <TouchableOpacity
        key={filter}
        onPress={() => setActiveFilter(filter)} // <--- Changes active tab
        style={{
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: 10,
          backgroundColor: isActive ? colors.tint : colors.card,
          borderWidth: 1,
          borderColor: isActive ? colors.tint : colors.border,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: isActive ? "#fff" : colors.textSecondary,
          }}
        >
          {filter}
        </Text>
      </TouchableOpacity>
    );
  })}
</View>

{/* Update the Notification List Block */}
{filteredItems.map((notification, idx) => {
          const config = typeConfig[notification.type];
          const Icon = config.icon;
          return (
            <Animated.View
              key={notification.id}
              entering={FadeInUp.delay(idx * 80).duration(500)}
              style={{
                marginHorizontal: 20,
                marginBottom: 10,
              }}
            >
              <TouchableOpacity
                onPress={() => markRead(notification.id)}
                activeOpacity={0.8}
                style={{
                  backgroundColor: notification.read
                    ? colors.card
                    : colors.cardElevated,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: notification.read ? colors.border : `${colors.tint}40`,
                  flexDirection: "row",
                  alignItems: "flex-start",
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: config.bg,
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12,
                  }}
                >
                  <Icon size={20} color={config.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: colors.text,
                        flex: 1,
                      }}
                    >
                      {notification.title}
                    </Text>
                    {!notification.read && (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: colors.tint,
                          marginLeft: 8,
                        }}
                      />
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.textSecondary,
                      lineHeight: 18,
                    }}
                  >
                    {notification.body}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.textMuted,
                      marginTop: 6,
                    }}
                  >
                    {timeAgo(notification.timestamp)}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </ScrollView>
      <Chatbot />
    </View>
  );
}
