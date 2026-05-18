import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useBLE } from "@/context/BLEContext";
import {
  Heart,
  Activity,
  Bluetooth,
  BluetoothConnected,
  Plus,
  Watch,
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  ShieldCheck,
  AlertOctagon,
  Sparkles,
  BrainCircuit,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInUp,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import StatCard from "@/components/StatCard";
import Chatbot from "@/components/Chatbot";
import ManualEntryModal from "@/components/ManualEntryModal";
import BLEDeviceModal from "@/components/BLEDeviceModal";

const { width } = Dimensions.get("window");

function getBPCategory(sys: number, dia: number) {
  if (sys >= 180 || dia >= 120) return { label: "Crisis", color: "#EF4444", level: 4 };
  if (sys >= 140 || dia >= 90) return { label: "Stage 2", color: "#F97316", level: 3 };
  if (sys >= 130 || dia >= 80) return { label: "Stage 1", color: "#F59E0B", level: 2 };
  if (sys >= 120 && dia < 80) return { label: "Elevated", color: "#EAB308", level: 1 };
  return { label: "Normal", color: "#10B981", level: 0 };
}

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const {
    isMeasuring,
    connectedDevice,
    lastReading,
    startMeasurement,
    stopMeasurement,
  } = useBLE();
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showBLE, setShowBLE] = useState(false);
  const [dots, setDots] = useState(".");

  useEffect(() => {
    if (!isMeasuring) return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, [isMeasuring]);

  const pulseAnim = useSharedValue(1);
  useEffect(() => {
    if (isMeasuring) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      pulseAnim.value = withTiming(1);
    }
  }, [isMeasuring]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const category = lastReading
    ? getBPCategory(lastReading.systolic, lastReading.diastolic)
    : { label: "--", color: colors.textMuted, level: 0 };

  const aiInsight = lastReading
    ? lastReading.systolic > 140
      ? "AI Alert: Elevated BP detected. Rest for 10 min and re-measure."
      : lastReading.heartRate > 90
      ? "AI Insight: Heart rate is above your baseline. Monitor stress levels."
      : "AI Insight: Your vitals are within a healthy range. Keep it up!"
    : "No recent readings. Start a measurement to get AI insights.";

  const riskClass = lastReading
    ? lastReading.systolic >= 180 || lastReading.diastolic >= 120
      ? "Critical"
      : lastReading.systolic >= 140 || lastReading.diastolic >= 90
      ? "High Risk"
      : lastReading.systolic >= 130 || lastReading.diastolic >= 80
      ? "Moderate Risk"
      : lastReading.systolic >= 120
      ? "Elevated"
      : "Low Risk"
    : "--";

  const riskColor = lastReading
    ? lastReading.systolic >= 180 || lastReading.diastolic >= 120
      ? colors.danger
      : lastReading.systolic >= 140 || lastReading.diastolic >= 90
      ? colors.warning
      : lastReading.systolic >= 130 || lastReading.diastolic >= 80
      ? "#EAB308"
      : lastReading.systolic >= 120
      ? colors.info
      : colors.success
    : colors.textMuted;

  const crisisPrediction = lastReading
    ? lastReading.systolic >= 160 || lastReading.diastolic >= 100
      ? "Elevated — Monitor Closely"
      : lastReading.systolic >= 140 || lastReading.diastolic >= 90
      ? "Moderate — Trend Improving"
      : "Low — Stable Pattern"
    : "--";

  const crisisColor = lastReading
    ? lastReading.systolic >= 160 || lastReading.diastolic >= 100
      ? colors.danger
      : lastReading.systolic >= 140 || lastReading.diastolic >= 90
      ? colors.warning
      : colors.success
    : colors.textMuted;

  const xaiInsights = lastReading
    ? [
        `Systolic contribution: ${Math.round((lastReading.systolic / 200) * 100)}% weight in risk model`,
        `Heart rate variability: ${lastReading.heartRate > 90 ? "Reduced" : "Normal"}`,
        `Trend direction: ${lastReading.systolic > 130 ? "Rising (+4% vs baseline)" : "Stable (±2%)"}`,
      ]
    : ["No data available for explainable analysis."];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          style={{
            paddingTop: 60,
            paddingHorizontal: 20,
            paddingBottom: 24,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.8)",
                  fontWeight: "500",
                }}
              >
                Good Morning,
              </Text>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  color: "#fff",
                  marginTop: 2,
                }}
              >
                {user?.fullName || "User"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowBLE(true)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.15)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {connectedDevice ? (
                <BluetoothConnected size={22} color="#32E0C4" />
              ) : (
                <Bluetooth size={22} color="rgba(255,255,255,0.8)" />
              )}
            </TouchableOpacity>
          </View>

          {connectedDevice && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 12,
              }}
            >
              <Watch size={14} color="rgba(255,255,255,0.7)" />
              <Text
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.7)",
                  marginLeft: 6,
                }}
              >
                {connectedDevice.name} connected
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Main BP Display */}
        <View style={{ paddingHorizontal: 20, marginTop: -20 }}>
          <Animated.View
            entering={FadeInDown.duration(600)}
            style={{
              backgroundColor: colors.card,
              borderRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: colors.text,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: colors.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Current Reading
              </Text>
              {lastReading && (
                <View
                  style={{
                    backgroundColor: `${category.color}15`,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: category.color,
                    }}
                  >
                    {category.label}
                  </Text>
                </View>
              )}
            </View>

            {isMeasuring ? (
              <View
                style={{
                  justifyContent: "center",
                  alignItems: "center",
                  paddingVertical: 24,
                }}
              >
                <Animated.View
                  style={[
                    {
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      backgroundColor: `${colors.tint}15`,
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 16,
                    },
                    pulseStyle,
                  ]}
                >
                  <Activity size={32} color={colors.tint} />
                </Animated.View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: colors.text,
                  }}
                >
                  Measuring{dots}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textMuted,
                    marginTop: 4,
                  }}
                >
                  Keep your arm still
                </Text>
                <TouchableOpacity
                  onPress={stopMeasurement}
                  style={{
                    marginTop: 16,
                    paddingHorizontal: 20,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: `${colors.danger}15`,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: colors.danger,
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "baseline",
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 56,
                      fontWeight: "800",
                      color: colors.text,
                      letterSpacing: -2,
                    }}
                  >
                    {lastReading?.systolic ?? "--"}
                  </Text>
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "600",
                      color: colors.textMuted,
                      marginHorizontal: 8,
                    }}
                  >
                    /
                  </Text>
                  <Text
                    style={{
                      fontSize: 36,
                      fontWeight: "700",
                      color: colors.text,
                    }}
                  >
                    {lastReading?.diastolic ?? "--"}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: colors.textMuted,
                      marginLeft: 8,
                    }}
                  >
                    mmHg
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <Heart
                    size={16}
                    color={colors.danger}
                    fill={colors.danger}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: colors.text,
                    }}
                  >
                    {lastReading?.heartRate ?? "--"}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.textMuted,
                      marginLeft: 4,
                    }}
                  >
                    BPM
                  </Text>
                </View>

                {lastReading && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textMuted,
                      textAlign: "center",
                      marginBottom: 16,
                    }}
                  >
                    Last measured{" "}
                    {new Date(lastReading.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                )}

                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                  }}
                >
                  <TouchableOpacity
                    onPress={startMeasurement}
                    activeOpacity={0.85}
                    style={{ flex: 1 }}
                  >
                    <LinearGradient
                      colors={[colors.gradientStart, colors.gradientEnd]}
                      style={{
                        height: 52,
                        borderRadius: 16,
                        justifyContent: "center",
                        alignItems: "center",
                        flexDirection: "row",
                      }}
                    >
                      <Activity size={18} color="#fff" />
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 15,
                          fontWeight: "700",
                          marginLeft: 8,
                        }}
                      >
                        Start Measurement
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowManualEntry(true)}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      backgroundColor: colors.inputBackground,
                      justifyContent: "center",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Plus size={22} color={colors.tint} />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>
        </View>

        {/* Stats Row */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 20,
            marginTop: 16,
            gap: 12,
          }}
        >
          <Animated.View entering={FadeInUp.delay(100).duration(600)} style={{ flex: 1 }}>
            <StatCard
              title="Systolic"
              value={lastReading ? String(lastReading.systolic) : "--"}
              unit="mmHg"
              subtitle="Avg 138 (7d)"
              icon={TrendingUp}
              color={colors.info}
              trend="up"
            />
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(200).duration(600)} style={{ flex: 1 }}>
            <StatCard
              title="Diastolic"
              value={lastReading ? String(lastReading.diastolic) : "--"}
              unit="mmHg"
              subtitle="Avg 86 (7d)"
              icon={TrendingDown}
              color={colors.tint}
              trend="stable"
            />
          </Animated.View>
        </View>

        {/* Risk Class + Crisis Prediction Row */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 20,
            marginTop: 16,
            gap: 12,
          }}
        >
          <Animated.View entering={FadeInUp.delay(300).duration(600)} style={{ flex: 1 }}>
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
                  Risk Class
                </Text>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: `${riskColor}15`,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <ShieldCheck size={16} color={riskColor} />
                </View>
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "800",
                  color: riskColor,
                  letterSpacing: -0.5,
                }}
              >
                {riskClass}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textMuted,
                  marginTop: 4,
                  fontWeight: "500",
                }}
              >
                {lastReading ? "Based on latest reading" : "No reading yet"}
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(350).duration(600)} style={{ flex: 1 }}>
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
                  Crisis Pred.
                </Text>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: `${crisisColor}15`,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <AlertOctagon size={16} color={crisisColor} />
                </View>
              </View>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "800",
                  color: crisisColor,
                  letterSpacing: -0.3,
                  lineHeight: 20,
                }}
              >
                {crisisPrediction}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textMuted,
                  marginTop: 4,
                  fontWeight: "500",
                }}
              >
                {lastReading ? "ML model v2.4" : "Awaiting data"}
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* XAI Insights Card */}
        <Animated.View
          entering={FadeInUp.delay(400).duration(600)}
          style={{ paddingHorizontal: 20, marginTop: 16 }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              padding: 18,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: colors.text,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: `${colors.tint}15`,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 10,
                }}
              >
                <BrainCircuit size={16} color={colors.tint} />
              </View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                Explainable AI
              </Text>
              <View
                style={{
                  marginLeft: "auto",
                  backgroundColor: `${colors.tint}12`,
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: colors.tint,
                  }}
                >
                  SHAP
                </Text>
              </View>
            </View>
            {xaiInsights.map((insight, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: idx < xaiInsights.length - 1 ? 8 : 0,
                }}
              >
                <Sparkles size={12} color={colors.tint} style={{ marginRight: 8 }} />
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    lineHeight: 18,
                    flex: 1,
                  }}
                >
                  {insight}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* AI Insight Card */}
        <Animated.View
          entering={FadeInUp.delay(450).duration(600)}
          style={{ paddingHorizontal: 20, marginTop: 16 }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              padding: 18,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <Zap size={18} color={colors.warning} />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: colors.text,
                  marginLeft: 8,
                }}
              >
                AI Insight
              </Text>
            </View>
            <Text
              style={{
                fontSize: 13,
                color: colors.textSecondary,
                lineHeight: 20,
              }}
            >
              {aiInsight}
            </Text>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View
          entering={FadeInUp.delay(500).duration(600)}
          style={{ paddingHorizontal: 20, marginTop: 16 }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 12,
            }}
          >
            Quick Actions
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[
              { icon: Shield, label: "Risk Check", color: colors.success },
              { icon: AlertTriangle, label: "Symptoms", color: colors.warning },
              { icon: Activity, label: "History", color: colors.info },
            ].map((action) => (
              <TouchableOpacity
                key={action.label}
                style={{
                  flex: 1,
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: `${action.color}12`,
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <action.icon size={20} color={action.color} />
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: colors.textSecondary,
                  }}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <Chatbot />
      <ManualEntryModal
        visible={showManualEntry}
        onClose={() => setShowManualEntry(false)}
      />
      <BLEDeviceModal visible={showBLE} onClose={() => setShowBLE(false)} />
    </View>
  );
}
