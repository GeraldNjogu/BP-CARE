import { useState, useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useBLE } from "@/context/BLEContext";
import { useAuth } from "@/context/AuthContext";
import { getLatestPrediction } from "@/services/predictions";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Heart,
  AlertCircle,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";
import LineChart from "@/components/LineCharts";
import Chatbot from "@/components/Chatbot";

const { width } = Dimensions.get("window");

type Period = "daily" | "weekly" | "monthly";

export default function ChartsScreen() {
  const { colors } = useTheme();
  const { history, isLoading: isBLELoading } = useBLE();
  const { user } = useAuth();
  
  const [period, setPeriod] = useState<Period>("daily");
  const [aiPrediction, setAiPrediction] = useState<{
    riskClass: string;
    riskScore: number;
    crisisProbability: number;
  } | null>(null);
  const [isPredictionLoading, setIsPredictionLoading] = useState(false);

  // 1. Fetch Real-time AI Predictions whenever the history updates
  useEffect(() => {
    async function fetchPrediction() {
      if (!user) return;
      try {
        setIsPredictionLoading(true);
        const data = await getLatestPrediction(user.id);
        if (data) {
          setAiPrediction({
            riskClass: data.riskClass,
            riskScore: data.riskScore,
            crisisProbability: data.crisisProbability,
          });
        }
      } catch (err) {
        console.error("Failed to load real-time AI insights:", err);
      } finally {
        setIsPredictionLoading(false);
      }
    }
    fetchPrediction();
  }, [user, history]);

  // 2. Dynamic Chart Aggregator: Transforms real-time vital history into chart datasets
  const chartData = useMemo(() => {
    if (!history || history.length === 0) {
      return {
        systolic: [{ label: "N/A", value: 120 }],
        diastolic: [{ label: "N/A", value: 80 }],
      };
    }

    // Sort ascending by time so charts plot chronological order left-to-right
    const sortedHistory = [...history].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const now = new Date();

    if (period === "daily") {
      const last24Hours = sortedHistory.filter(
        (r) => now.getTime() - r.timestamp.getTime() <= 24 * 60 * 60 * 1000
      );
      
      const targetList = last24Hours.length >= 2 ? last24Hours : sortedHistory.slice(-6);
      return {
        systolic: targetList.map((r) => ({
          label: r.timestamp.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          value: r.systolic,
        })),
        diastolic: targetList.map((r) => ({
          label: r.timestamp.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          value: r.diastolic,
        })),
      };
    }

    if (period === "weekly") {
      const pastWeek = sortedHistory.filter(
        (r) => now.getTime() - r.timestamp.getTime() <= 7 * 24 * 60 * 60 * 1000
      );
      
      const targetList = pastWeek.length >= 2 ? pastWeek : sortedHistory.slice(-7);
      return {
        systolic: targetList.map((r) => ({
          label: r.timestamp.toLocaleDateString("en-US", { weekday: "short" }),
          value: r.systolic,
        })),
        diastolic: targetList.map((r) => ({
          label: r.timestamp.toLocaleDateString("en-US", { weekday: "short" }),
          value: r.diastolic,
        })),
      };
    }

    if (period === "monthly") {
      const targetList = sortedHistory.slice(-10);
      return {
        systolic: targetList.map((r) => ({
          label: r.timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          value: r.systolic,
        })),
        diastolic: targetList.map((r) => ({
          label: r.timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          value: r.diastolic,
        })),
      };
    }

    return { systolic: [], diastolic: [] };
  }, [history, period]);

  // 3. Mathematical Indicators for Trend Banners
  const statsSummary = useMemo(() => {
    if (history.length < 2) {
      return { sysDiff: 0, diaDiff: 0, trend: "stable" };
    }
    const current = history[0];
    const previous = history[1];
    const sysDiff = current.systolic - previous.systolic;
    const diaDiff = current.diastolic - previous.diastolic;

    let trend: "up" | "down" | "stable" = "stable";
    if (sysDiff > 3) trend = "up";
    else if (sysDiff < -3) trend = "down";

    return { sysDiff, diaDiff, trend };
  }, [history]);

  if (isBLELoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={{ color: colors.textMuted, marginTop: 12 }}>Syncing dynamic vital records...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* Header Title Section */}
        <View style={{ marginBottom: 24, marginTop: 20 }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: colors.text, letterSpacing: -0.5 }}>
            Trends & Analytics
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
            Real-time biometric insights powered by BPCare AI
          </Text>
        </View>

        {/* Dynamic Period Selectors */}
        <View style={{ flexDirection: "row", backgroundColor: colors.card, padding: 4, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border }}>
          {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: "center",
                backgroundColor: period === p ? colors.background : "transparent",
                borderRadius: 12,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: period === p ? "700" : "500", color: period === p ? colors.tint : colors.textMuted, textTransform: "capitalize" }}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Live Vector Charts Display Grid */}
        <Animated.View entering={FadeInUp.delay(100)} style={{ backgroundColor: colors.card, borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>Blood Pressure Curve</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{period === "daily" ? "Fluctuations today" : "Averages over selected frame"}</Text>
            </View>
            
            {/* Live Changing Trend Pill Indicator */}
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: statsSummary.trend === "up" ? colors.danger + "15" : statsSummary.trend === "down" ? colors.success + "15" : colors.textMuted + "15", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 }}>
              {statsSummary.trend === "up" && <TrendingUp size={14} color={colors.danger} style={{ marginRight: 4 }} />}
              {statsSummary.trend === "down" && <TrendingDown size={14} color={colors.success} style={{ marginRight: 4 }} />}
              {statsSummary.trend === "stable" && <Minus size={14} color={colors.textMuted} style={{ marginRight: 4 }} />}
              <Text style={{ fontSize: 12, fontWeight: "600", color: statsSummary.trend === "up" ? colors.danger : statsSummary.trend === "down" ? colors.success : colors.textMuted }}>
                {statsSummary.trend === "up" ? `+${statsSummary.sysDiff} mmHg` : statsSummary.trend === "down" ? `${statsSummary.sysDiff} mmHg` : "Stable"}
              </Text>
            </View>
          </View>

          {/* Core SVG Rendering Engine */}
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.tint, marginBottom: 4 }}>Systolic BP (mmHg)</Text>
          <LineChart data={chartData.systolic} width={width - 80} height={140} color={colors.tint} />
          
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />
          
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#FF9F43", marginBottom: 4 }}>Diastolic BP (mmHg)</Text>
          <LineChart data={chartData.diastolic} width={width - 80} height={140} color="#FF9F43" />
        </Animated.View>

        {/* Real-Time Predictive AI Diagnostics Matrix */}
        <Animated.View entering={FadeInUp.delay(200)}>
          <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 20, marginBottom: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Activity size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#fff" }}>AI Clinical Analysis</Text>
              </View>
              {isPredictionLoading && <ActivityIndicator size="small" color="#fff" />}
            </View>

            {aiPrediction ? (
              <View>
                <View style={{ backgroundColor: "rgba(255,255,255,0.15)", padding: 14, borderRadius: 16, marginBottom: 12 }}>
                  <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600", textTransform: "uppercase" }}>Current Classification</Text>
                  <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 2, textTransform: "capitalize" }}>{aiPrediction.riskClass}</Text>
                </View>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.1)", padding: 12, borderRadius: 14 }}>
                    <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "500" }}>Risk Score</Text>
                    <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginTop: 2 }}>{aiPrediction.riskScore * 100}%</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.1)", padding: 12, borderRadius: 14 }}>
                    <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "500" }}>Crisis Prob.</Text>
                    <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginTop: 2 }}>{(aiPrediction.crisisProbability * 100).toFixed(0)}%</Text>
                  </View>
                </View>
              </View>
            ) : (
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, fontStyle: "italic" }}>
                Add vital entries on your dashboard or connect a device to compute automatic risk stratification models.
              </Text>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Dynamic History Timeline Feed */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 12 }}>Biometric Feed</Text>
          
          {history.length === 0 ? (
            <View style={{ padding: 30, alignItems: "center" }}>
              <AlertCircle size={28} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, marginTop: 8, fontSize: 14 }}>No readings logged yet.</Text>
            </View>
          ) : (
            history.slice(0, 5).map((reading, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: colors.card,
                  padding: 16,
                  borderRadius: 16,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: reading.source === "ble" ? colors.tint + "15" : "#FF9F43" + "15", justifyContent: "center", alignItems: "center", marginRight: 12 }}>
                    <Activity size={18} color={reading.source === "ble" ? colors.tint : "#FF9F43"} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
                      {reading.systolic}/{reading.diastolic}{" "}
                      <Text style={{ fontSize: 12, fontWeight: "500", color: colors.textMuted }}>mmHg</Text>
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                      <Heart size={10} color={colors.danger} style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 11, color: colors.textSecondary }}>{reading.heartRate} BPM • </Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>{reading.source === "ble" ? "Wearable" : "Manual Input"}</Text>
                    </View>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: "500" }}>
                  {reading.timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </Text>
              </View>
            ))
          )}
        </View>

      </ScrollView>
      <Chatbot />
    </View>
  );
}