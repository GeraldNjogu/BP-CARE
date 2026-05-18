import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import {
  Heart,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Activity,
} from "lucide-react-native";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";

export default function SignInScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (!success) {
      Alert.alert("Error", "Invalid credentials");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          style={{
            height: 280,
            borderBottomLeftRadius: 40,
            borderBottomRightRadius: 40,
            justifyContent: "center",
            alignItems: "center",
            paddingTop: 60,
          }}
        >
          <Animated.View
            entering={FadeInDown.duration(800)}
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              backgroundColor: "rgba(255,255,255,0.2)",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Heart size={40} color="#fff" fill="#fff" />
          </Animated.View>
          <Animated.Text
            entering={FadeInDown.delay(200).duration(800)}
            style={{
              fontSize: 32,
              fontWeight: "800",
              color: "#fff",
              letterSpacing: -0.5,
            }}
          >
            BPCare AI
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(300).duration(800)}
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.85)",
              marginTop: 6,
            }}
          >
            Intelligent Blood Pressure Management
          </Animated.Text>
        </LinearGradient>

        <View style={{ padding: 24, paddingTop: 32 }}>
          <Animated.Text
            entering={FadeInUp.duration(600)}
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 24,
            }}
          >
            Welcome Back
          </Animated.Text>

          <Animated.View
            entering={FadeInUp.delay(100).duration(600)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.inputBackground,
              borderRadius: 16,
              paddingHorizontal: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              height: 56,
            }}
          >
            <Mail size={20} color={colors.textMuted} />
            <TextInput
              placeholder="Email address"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={{
                flex: 1,
                marginLeft: 12,
                fontSize: 16,
                color: colors.text,
                height: 56,
              }}
            />
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(200).duration(600)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.inputBackground,
              borderRadius: 16,
              paddingHorizontal: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              height: 56,
            }}
          >
            <Lock size={20} color={colors.textMuted} />
            <TextInput
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={{
                flex: 1,
                marginLeft: 12,
                fontSize: 16,
                color: colors.text,
                height: 56,
              }}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <EyeOff size={20} color={colors.textMuted} />
              ) : (
                <Eye size={20} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(300).duration(600)}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <TouchableOpacity
              onPress={() => setRememberMe(!rememberMe)}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: rememberMe ? colors.tint : colors.textMuted,
                  backgroundColor: rememberMe ? colors.tint : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {rememberMe && (
                  <Activity size={12} color="#fff" />
                )}
              </View>
              <Text
                style={{
                  marginLeft: 8,
                  fontSize: 14,
                  color: colors.textSecondary,
                }}
              >
                Remember me
              </Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.tint,
                  fontWeight: "600",
                }}
              >
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).duration(600)}>
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                style={{
                  height: 56,
                  borderRadius: 16,
                  justifyContent: "center",
                  alignItems: "center",
                  flexDirection: "row",
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 16,
                        fontWeight: "700",
                        marginRight: 8,
                      }}
                    >
                      Sign In
                    </Text>
                    <ArrowRight size={18} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(500).duration(600)}
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginTop: 24,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
              }}
            >
              Don't have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.tint,
                  fontWeight: "700",
                }}
              >
                Sign Up
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
