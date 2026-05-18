import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useBLE } from "@/context/BLEContext";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Heart,
  AlertCircle,
  ChevronRight,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";
import LineChart from "@/components/LineCharts";
import Chatbot from "@/components/Chatbot";

const { width } = Dimensions.get("window");

type Period = "daily" | "weekly" | "monthly";

const dailyData = {
  systolic: [
    { label: "6am", value: 128 },
    { label: "9am", value: 135 },
    { label: "12pm", value: 142 },
    { label: "3pm", value: 138 },
    { label: "6pm", value: 145 },
    { label: "9pm", value: 132 },
  ],
  diastolic: [
    { label: "6am", value: 82 },
    { label: "9am", value: 86 },
    { label: "12pm", value: 90 },
    { label: "3pm", value: 88 },
    { label: "6pm", value: 92 },
    { label: "9pm", value: 84 },
  ],
  heartRate: [
    { label: "6am", value: 65 },
    { label: "9am", value: 72 },
    { label: "12pm", value: 78 },
    { label: "3pm", value: 74 },
    { label: "6pm", value: 80 },
    { label: "9pm", value: 68 },
  ],
};

const weeklyData = {
  systolic: [
    { label: "Mon", value: 138 },
    { label: "Tue", value: 142 },
    { label: "Wed", value: 135 },
    { label: "Thu", value: 145 },
    { label: "Fri", value: 132 },
    { label: "Sat", value: 128 },
    { label: "Sun", value: 140 },
  ],
  diastolic: [
    { label: "Mon", value: 88 },
    { label: "Tue", value: 90 },
    { label: "Wed", value: 85 },
    { label: "Thu", value: 92 },
    { label: "Fri", value: 84 },
    { label: "Sat", value: 82 },
    { label: "Sun", value: 88 },
  ],
  heartRate: [
    { label: "Mon", value: 72 },
    { label: "Tue", value: 75 },
    { label: "Wed", value: 70 },
    { label: "Thu", value: 78 },
    { label: "Fri", value: 68 },
    { label: "Sat", value: 65 },
    { label: "Sun", value: 74 },
  ],
};

const monthlyData = {
  systolic: [
    { label: "W1", value: 142 },
    { label: "W2", value: 138 },
    { label: "W3", value: 135 },
    { label: "W4", value: 132 },
  ],
  diastolic: [
    { label: "W1", value: 90 },
    { label: "W2", value: 88 },
    { label: "W3", value: 85 },
    { label: "W4", value: 82 },
  ],
  heartRate: [
    { label: "W1", value: 75 },
    { label: "W2", value: 72 },
    { label: "W3", value: 70 },
    { label: "W4", value: 68 },
  ],
};

const insights = [
  {
    icon: TrendingUp,
    color: "#F59E0B",
    title: "Rising Trend Detected",
    body: "Your systolic BP has increased by 8% over the last 5 days. Consider reviewing sodium intake and sleep patterns.",
  },
  {
    icon: Heart,
    color: "#EF4444",
    title: "Elevated Resting HR",
    body: "Your resting heart rate averaged 76 BPM this week, 5 BPM above your baseline. Stress management may help.",
  },
  {
    icon: Activity,
    color: "#10B981",
    title: "Improving Stability",
    body: "Medication adherence has improved your BP variability by 15% over the past 2 weeks. Keep it up!",
  },
];

export default function ChartsScreen() {
  const { colors } = useTheme();
  const { history } = useBLE();
  const [period, setPeriod] = useState<Period>("weekly");

  const data = period === "daily" ? dailyData : period === "weekly" ? weeklyData : monthlyData;

  const averages = {
    systolic: Math.round(data.systolic.reduce((a, b) => a + b.value, 0) / data.systolic.length),
    diastolic: Math.round(data.diastolic.reduce((a, b) => a + b.value, 0) / data.diastolic.length),
    heartRate: Math.round(data.heartRate.reduce((a, b) => a + b.value, 0) / data.heartRate.length),
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
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: "800",
              color: colors.text,
            }}
          >
            Trends & Analytics
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textMuted,
              marginTop: 4,
            }}
          >
            Track your cardiovascular health over time
          </Text>
        </View>

        {/* Period Selector */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 20,
            marginBottom: 16,
            gap: 8,
          }}
        >
          {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={{
                flex: 1,
                height: 40,
                borderRadius: 12,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: period === p ? colors.tint : colors.card,
                borderWidth: 1,
                borderColor: period === p ? colors.tint : colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: period === p ? "#fff" : colors.textSecondary,
                  textTransform: "capitalize",
                }}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Stats */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 20,
            gap: 10,
            marginBottom: 16,
          }}
        >
          {[
            { label: "Avg Systolic", value: `${averages.systolic}`, unit: "mmHg", color: colors.info },
            { label: "Avg Diastolic", value: `${averages.diastolic}`, unit: "mmHg", color: colors.tint },
            { label: "Avg HR", value: `${averages.heartRate}`, unit: "BPM", color: colors.danger },
          ].map((stat) => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 14,
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: colors.textMuted,
                  marginBottom: 4,
                }}
              >
                {stat.label}
              </Text>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  color: stat.color,
                }}
              >
                {stat.value}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: colors.textMuted,
                }}
              >
                {stat.unit}
              </Text>
            </View>
          ))}
        </View>

        {/* Systolic Chart */}
        <Animated.View
          entering={FadeInUp.duration(600)}
          style={{
            marginHorizontal: 20,
            backgroundColor: colors.card,
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: colors.text,
              }}
            >
              Systolic BP
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.info,
                  marginRight: 6,
                }}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textMuted,
                }}
              >
                mmHg
              </Text>
            </View>
          </View>
          <LineChart
            data={data.systolic}
            width={width - 72}
            height={180}
            color={colors.info}
          />
        </Animated.View>

        {/* Diastolic Chart */}
        <Animated.View
          entering={FadeInUp.delay(100).duration(600)}
          style={{
            marginHorizontal: 20,
            backgroundColor: colors.card,
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: colors.text,
              }}
            >
              Diastolic BP
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.tint,
                  marginRight: 6,
                }}
              />
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                mmHg
              </Text>
            </View>
          </View>
          <LineChart
            data={data.diastolic}
            width={width - 72}
            height={180}
            color={colors.tint}
          />
        </Animated.View>

        {/* Heart Rate Chart */}
        <Animated.View
          entering={FadeInUp.delay(200).duration(600)}
          style={{
            marginHorizontal: 20,
            backgroundColor: colors.card,
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: colors.text,
              }}
            >
              Heart Rate
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.danger,
                  marginRight: 6,
                }}
              />
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                BPM
              </Text>
            </View>
          </View>
          <LineChart
            data={data.heartRate}
            width={width - 72}
            height={180}
            color={colors.danger}
          />
        </Animated.View>

        {/* AI Insights Panel */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 12,
            }}
          >
            AI Insights
          </Text>
          {insights.map((insight, idx) => (
            <Animated.View
              key={idx}
              entering={FadeInUp.delay(idx * 100).duration(600)}
              style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 16,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: "row",
                alignItems: "flex-start",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: `${insight.color}12`,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                <insight.icon size={18} color={insight.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: colors.text,
                    marginBottom: 4,
                  }}
                >
                  {insight.title}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    lineHeight: 18,
                  }}
                >
                  {insight.body}
                </Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Recent History */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 12,
            }}
          >
            Recent History
          </Text>
          {history.slice(0, 5).map((reading, idx) => (
            <View
              key={idx}
              style={{
                backgroundColor: colors.card,
                borderRadius: 14,
                padding: 14,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: colors.text,
                  }}
                >
                  {reading.systolic}/{reading.diastolic}{" "}
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "500",
                      color: colors.textMuted,
                    }}
                  >
                    mmHg
                  </Text>
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                  <Heart size={12} color={colors.danger} style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {reading.heartRate} BPM
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginLeft: 8 }}>
                    {reading.source === "ble" ? "Smartwatch" : "Manual"}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                {reading.timestamp.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <Chatbot />
    </View>
  );
}
