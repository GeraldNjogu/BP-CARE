import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Switch } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useBLE } from "@/context/BLEContext";
import { getSettings, updateSettings } from "@/services/settings";
import MedicationTimeModal from "@/components/MedicationTimeModal";
import {
  Moon,
  Bell,
  Bluetooth,
  Shield,
  Globe,
  LogOut,
  ChevronRight,
  Smartphone,
  Database,
  Trash2,
  HelpCircle,
  Info,
  Clock,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";
import Chatbot from "@/components/Chatbot";

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { logout, user } = useAuth();
  const { connectedDevice } = useBLE();
  
  // App states matching your original structure + new calendar sync states
  const [notifications, setNotifications] = useState(true);
  const [medicationReminders, setMedicationReminders] = useState(true);
  const [bpAlerts, setBpAlerts] = useState(true);
  const [dataSync, setDataSync] = useState(true);
  const [autoReconnect, setAutoReconnect] = useState(true);
  
  // Real-time alarm schedules tracking states
  const [reminderTimes, setReminderTimes] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Sync state data safely directly out of Supabase on layout initialization
  useEffect(() => {
    if (user) {
      getSettings(user.id)
        .then((data) => {
          if (data) {
            setNotifications(data.notificationsEnabled);
            setMedicationReminders(data.medicationReminders);
            setBpAlerts(data.bpAlerts);
            setReminderTimes(data.medicationReminderTimes || []);
          }
        })
        .catch((err) => console.error("Error fetching settings profile:", err));
    }
  }, [user]);

  // Persistent switch toggle handlers matching your atomic state layout
  const handleToggleNotifications = async (val: boolean) => {
    setNotifications(val);
    if (user) await updateSettings(user.id, { notificationsEnabled: val });
  };

  const handleToggleReminders = async (val: boolean) => {
    setMedicationReminders(val);
    if (user) await updateSettings(user.id, { medicationReminders: val });
  };

  const handleToggleBpAlerts = async (val: boolean) => {
    setBpAlerts(val);
    if (user) await updateSettings(user.id, { bpAlerts: val });
  };

  const handleSaveTimes = async (newTimes: string[]) => {
    setReminderTimes(newTimes);
    if (user) await updateSettings(user.id, { medicationReminderTimes: newTimes });
  };

 // 1. Define explicit TypeScript shapes for the settings configuration matrix
  type SettingsItem = {
    icon: any;
    label: string;
    value: string;
    toggle?: boolean;
    state?: boolean;
    onToggle?: (val: boolean) => void | Promise<void>;
    chevron?: boolean;
    action?: () => void;
    danger?: boolean;
  };

  type SettingsSection = {
    title: string;
    items: SettingsItem[];
  };

  // 2. Apply the SettingsSection[] type to your array
  const settingsSections: SettingsSection[] = [
    {
      title: "Appearance",
      items: [
        {
          icon: Moon,
          label: "Dark Mode",
          value: isDark ? "On" : "Off",
          toggle: true,
          state: isDark,
          onToggle: toggleTheme,
        },
      ],
    },
    {
      title: "Notifications",
      items: [
        {
          icon: Bell,
          label: "Push Notifications",
          value: notifications ? "Enabled" : "Disabled",
          toggle: true,
          state: notifications,
          onToggle: handleToggleNotifications,
        },
        {
          icon: Bell,
          label: "Medication Reminders",
          value: medicationReminders ? "Enabled" : "Disabled",
          toggle: true,
          state: medicationReminders,
          onToggle: handleToggleReminders,
        },
        {
          icon: Clock,
          label: "Setup Alarm Schedules",
          value: reminderTimes.length > 0 ? `${reminderTimes.length} alarms saved` : "None configured",
          chevron: true,
          action: () => setModalVisible(true), // <-- 'action' is now perfectly safe
        },
        {
          icon: Bell,
          label: "BP Level Alerts",
          value: bpAlerts ? "Enabled" : "Disabled",
          toggle: true,
          state: bpAlerts,
          onToggle: handleToggleBpAlerts,
        },
      ],
    },
    {
      title: "Bluetooth & Devices",
      items: [
        {
          icon: Bluetooth,
          label: "Connected Device",
          value: connectedDevice?.name || "None",
          chevron: true,
        },
        {
          icon: Smartphone,
          label: "Auto Reconnect",
          value: autoReconnect ? "Enabled" : "Disabled",
          toggle: true,
          state: autoReconnect,
          onToggle: () => setAutoReconnect(!autoReconnect),
        },
      ],
    },
    {
      title: "Data & Privacy",
      items: [
        {
          icon: Database,
          label: "Cloud Sync",
          value: dataSync ? "Enabled" : "Disabled",
          toggle: true,
          state: dataSync,
          onToggle: () => setDataSync(!dataSync),
        },
        {
          icon: Shield,
          label: "Privacy Settings",
          value: "Manage encryption & RLS data options",
          chevron: true,
        },
        {
          icon: Trash2,
          label: "Clear Health Data",
          value: "Wipe device cache securely",
          chevron: true,
          danger: true,
        },
      ],
    },
    {
      title: "General",
      items: [
        {
          icon: Globe,
          label: "Language",
          value: "English",
          chevron: true,
        },
        {
          icon: HelpCircle,
          label: "Help & Support",
          value: "",
          chevron: true,
        },
        {
          icon: Info,
          label: "About BPCare AI",
          value: "v1.0.0",
          chevron: true,
        },
      ],
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: colors.text }}>
            Settings
          </Text>
          <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>
            Customize your experience
          </Text>
        </View>

        {/* Dynamic Sections Generator Loop */}
        {settingsSections.map((section, sIdx) => (
          <Animated.View
            key={section.title}
            entering={FadeInUp.delay(sIdx * 100).duration(600)}
            style={{ paddingHorizontal: 20, marginBottom: 20 }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: colors.textSecondary,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
                marginLeft: 4,
              }}
            >
              {section.title}
            </Text>
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: "hidden",
              }}
            >
              {section.items.map((item, iIdx) => {
                const ItemWrapper = item.action ? TouchableOpacity : View;
                return (
                  <ItemWrapper
                    key={item.label}
                    {...(item.action ? { onPress: item.action, activeOpacity: 0.7 } : {})}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderBottomWidth: iIdx < section.items.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: item.danger
                          ? `${colors.danger}12`
                          : colors.inputBackground,
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 12,
                      }}
                    >
                      <item.icon
                        size={18}
                        color={item.danger ? colors.danger : colors.tint}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "600",
                          color: item.danger ? colors.danger : colors.text,
                        }}
                      >
                        {item.label}
                      </Text>
                      {item.value ? (
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.textMuted,
                            marginTop: 1,
                          }}
                        >
                          {item.value}
                        </Text>
                      ) : null}
                    </View>
                    {item.toggle ? (
                      <Switch
                        value={item.state}
                        onValueChange={item.onToggle}
                        trackColor={{
                          false: colors.border,
                          true: `${colors.tint}80`,
                        }}
                        thumbColor={
                          item.state ? colors.tint : colors.textMuted
                        }
                      />
                    ) : item.chevron ? (
                      <ChevronRight size={18} color={colors.textMuted} />
                    ) : null}
                  </ItemWrapper>
                );
              })}
            </View>
          </Animated.View>
        ))}

        {/* Logout Section */}
        <Animated.View
          entering={FadeInUp.delay(500).duration(600)}
          style={{ paddingHorizontal: 20, marginBottom: 30 }}
        >
          <TouchableOpacity onPress={logout} activeOpacity={0.85}>
            <View
              style={{
                backgroundColor: `${colors.danger}10`,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: `${colors.danger}30`,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LogOut size={18} color={colors.danger} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: colors.danger,
                  marginLeft: 8,
                }}
              >
                Sign Out
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
      
      {/* Medication Time Selector Modal overlay layout view */}
      <MedicationTimeModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        savedTimes={reminderTimes}
        onSave={handleSaveTimes}
      />
      <Chatbot />
    </View>
  );
}