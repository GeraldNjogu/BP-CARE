import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import type { LucideIcon } from "lucide-react-native";

export default function StatCard({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: string;
  unit: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  trend?: "up" | "down" | "stable";
}) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        flex: 1,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: colors.textSecondary,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {title}
        </Text>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: `${color}15`,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Icon size={16} color={color} />
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline" }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            color: colors.text,
            letterSpacing: -0.5,
          }}
        >
          {value}
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "500",
            color: colors.textMuted,
            marginLeft: 4,
          }}
        >
          {unit}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 12,
          color:
            trend === "up"
              ? colors.danger
              : trend === "down"
              ? colors.success
              : colors.textMuted,
          marginTop: 4,
          fontWeight: "500",
        }}
      >
        {subtitle}
      </Text>
    </View>
  );
}
