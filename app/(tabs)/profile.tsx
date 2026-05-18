import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useBLE } from "@/context/BLEContext";
import {
  User,
  Mail,
  Calendar,
  Ruler,
  Weight,
  Activity,
  Cigarette,
  Wine,
  Stethoscope,
  Watch,
  BluetoothConnected,
  ChevronRight,
  Heart,
  Edit3,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";
import Chatbot from "@/components/Chatbot";

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { connectedDevice, history } = useBLE();

  const profileSections = [
    {
      title: "Personal Information",
      items: [
        { icon: User, label: "Full Name", value: user?.fullName || "--" },
        { icon: Mail, label: "Email", value: user?.email || "--" },
        { icon: Calendar, label: "Age", value: user ? `${user.age} years` : "--" },
        { icon: Activity, label: "Gender", value: user ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : "--" },
      ],
    },
    {
      title: "Health Metrics",
      items: [
        { icon: Ruler, label: "Height", value: user ? `${user.height} cm` : "--" },
        { icon: Weight, label: "Weight", value: user ? `${user.weight} kg` : "--" },
        { icon: Activity, label: "BMI", value: user ? `${user.bmi}` : "--" },
      ],
    },
    {
      title: "Lifestyle",
      items: [
        { icon: Cigarette, label: "Smoking", value: user ? user.smoking.charAt(0).toUpperCase() + user.smoking.slice(1) : "--" },
        { icon: Wine, label: "Alcohol", value: user ? user.alcohol.charAt(0).toUpperCase() + user.alcohol.slice(1) : "--" },
      ],
    },
    {
      title: "Medical History",
      items: user?.conditions.length
        ? user.conditions.map((c) => ({ icon: Stethoscope, label: "Condition", value: c }))
        : [{ icon: Stethoscope, label: "Conditions", value: "None recorded" }],
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with gradient */}
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          style={{
            paddingTop: 60,
            paddingHorizontal: 20,
            paddingBottom: 80,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: "rgba(255,255,255,0.15)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Edit3 size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={{ alignItems: "center", marginTop: 8 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "rgba(255,255,255,0.2)",
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 3,
                borderColor: "rgba(255,255,255,0.3)",
              }}
            >
              <User size={36} color="#fff" />
            </View>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "800",
                color: "#fff",
                marginTop: 12,
              }}
            >
              {user?.fullName || "User"}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.8)",
                marginTop: 4,
              }}
            >
              {user?.email || "--"}
            </Text>
          </View>
        </LinearGradient>

        {/* Stats Overlay */}
        <View
          style={{
            flexDirection: "row",
            marginHorizontal: 20,
            marginTop: -40,
            gap: 10,
          }}
        >
          {[
            {
              icon: Heart,
              label: "Readings",
              value: `${history.length}`,
              color: colors.danger,
            },
            {
              icon: Activity,
              label: "Avg BP",
              value: "138/86",
              color: colors.info,
            },
            {
              icon: Watch,
              label: "Device",
              value: connectedDevice ? "Connected" : "None",
              color: colors.success,
            },
          ].map((stat, idx) => (
            <Animated.View
              key={idx}
              entering={FadeInUp.delay(idx * 100).duration(600)}
              style={{
                flex: 1,
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 14,
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: colors.text,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <stat.icon size={18} color={stat.color} />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "800",
                  color: colors.text,
                  marginTop: 6,
                }}
              >
                {stat.value}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "500",
                  color: colors.textMuted,
                  marginTop: 2,
                }}
              >
                {stat.label}
              </Text>
            </Animated.View>
          ))}
        </View>

        {/* Profile Sections */}
        {profileSections.map((section, sIdx) => (
          <Animated.View
            key={section.title}
            entering={FadeInUp.delay(sIdx * 100 + 300).duration(600)}
            style={{ paddingHorizontal: 20, marginTop: 20 }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: colors.textSecondary,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 10,
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
              {section.items.map((item, iIdx) => (
                <View
                  key={`${item.label}-${iIdx}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 14,
                    borderBottomWidth:
                      iIdx < section.items.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: colors.inputBackground,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                  >
                    <item.icon size={18} color={colors.tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textMuted,
                      }}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: colors.text,
                        marginTop: 2,
                      }}
                    >
                      {item.value}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        ))}

        {/* Connected Device */}
        <Animated.View
          entering={FadeInUp.delay(600).duration(600)}
          style={{ paddingHorizontal: 20, marginTop: 20, marginBottom: 20 }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: colors.textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 10,
            }}
          >
            Connected Wearable
          </Text>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: connectedDevice
                  ? `${colors.success}12`
                  : colors.inputBackground,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 14,
              }}
            >
              {connectedDevice ? (
                <BluetoothConnected size={22} color={colors.success} />
              ) : (
                <Watch size={22} color={colors.textMuted} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                {connectedDevice?.name || "No Device Connected"}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: connectedDevice ? colors.success : colors.textMuted,
                  marginTop: 2,
                }}
              >
                {connectedDevice
                  ? "Connected via Bluetooth LE"
                  : "Tap to pair a wearable"}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </View>
        </Animated.View>
      </ScrollView>
      <Chatbot />
    </View>
  );
}
