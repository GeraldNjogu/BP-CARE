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
  User,
  ChevronDown,
} from "lucide-react-native";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";

export default function SignUpScreen() {
  const router = useRouter();
  const { signup } = useAuth();
  const { colors } = useTheme();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    age: "",
    gender: "male" as "male" | "female" | "other",
    height: "",
    weight: "",
    smoking: "never" as "never" | "former" | "current",
    alcohol: "none" as "none" | "light" | "moderate" | "heavy",
    conditions: "",
  });

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!form.fullName || !form.email || !form.password) {
        Alert.alert("Error", "Please fill in all required fields");
        return;
      }
      setStep(2);
    } else {
      handleSignup();
    }
  };

  const handleSignup = async () => {
    if (!form.age || !form.height || !form.weight) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    setLoading(true);

    try {
      // 1. Call the signup service
      const success = await signup({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        age: parseInt(form.age, 10),
        gender: form.gender,
        height: parseInt(form.height, 10),
        weight: parseInt(form.weight, 10),
        smoking: form.smoking,
        alcohol: form.alcohol,
        conditions: form.conditions ? form.conditions.split(",") : [],
      });

      // 2. Handle the result
      if (success) {
        // If success is true, AuthContext will automatically redirect you.
      } else {
        // If it returns false, it means the Auth worked but the profile fetch timed out.
        // Since the user was successfully created in the DB, we show a success message.
        Alert.alert(
          "Account Created", 
          "Your account was created successfully! Please sign in to access your dashboard.",
          [{ text: "Go to Sign In", onPress: () => router.push("/(auth)/signin") }]
        );
      }
    } catch (error: any) {
      // This catches actual errors (like "Email already in use")
      Alert.alert("Signup Error", error.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <>
      <Animated.Text
        entering={FadeInUp.duration(600)}
        style={{
          fontSize: 24,
          fontWeight: "700",
          color: colors.text,
          marginBottom: 24,
        }}
      >
        Create Account
      </Animated.Text>

      <InputField
        icon={<User size={20} color={colors.textMuted} />}
        placeholder="Full name"
        value={form.fullName}
        onChangeText={(v) => updateField("fullName", v)}
        colors={colors}
      />
      <InputField
        icon={<Mail size={20} color={colors.textMuted} />}
        placeholder="Email address"
        value={form.email}
        onChangeText={(v) => updateField("email", v)}
        keyboardType="email-address"
        autoCapitalize="none"
        colors={colors}
      />
      <View
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
          value={form.password}
          onChangeText={(v) => updateField("password", v)}
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
      </View>
    </>
  );

  const renderStep2 = () => (
    <>
      <Animated.Text
        entering={FadeInUp.duration(600)}
        style={{
          fontSize: 24,
          fontWeight: "700",
          color: colors.text,
          marginBottom: 24,
        }}
      >
        Health Profile
      </Animated.Text>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <InputField
            icon={<Text style={{ color: colors.textMuted, fontSize: 14 }}>Age</Text>}
            placeholder="Years"
            value={form.age}
            onChangeText={(v) => updateField("age", v)}
            keyboardType="numeric"
            colors={colors}
          />
        </View>
        <View style={{ flex: 1 }}>
          <InputField
            icon={<Text style={{ color: colors.textMuted, fontSize: 14 }}>Hgt</Text>}
            placeholder="cm"
            value={form.height}
            onChangeText={(v) => updateField("height", v)}
            keyboardType="numeric"
            colors={colors}
          />
        </View>
        <View style={{ flex: 1 }}>
          <InputField
            icon={<Text style={{ color: colors.textMuted, fontSize: 14 }}>Wgt</Text>}
            placeholder="kg"
            value={form.weight}
            onChangeText={(v) => updateField("weight", v)}
            keyboardType="numeric"
            colors={colors}
          />
        </View>
      </View>

      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: colors.textSecondary,
          marginBottom: 8,
          marginTop: 8,
        }}
      >
        Gender
      </Text>
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
        {(["male", "female", "other"] as const).map((g) => (
          <TouchableOpacity
            key={g}
            onPress={() => updateField("gender", g)}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 12,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor:
                form.gender === g ? colors.tint : colors.inputBackground,
              borderWidth: 1,
              borderColor:
                form.gender === g ? colors.tint : colors.inputBorder,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: form.gender === g ? "#fff" : colors.textSecondary,
                textTransform: "capitalize",
              }}
            >
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: colors.textSecondary,
          marginBottom: 8,
        }}
      >
        Smoking Status
      </Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        {(["never", "former", "current"] as const).map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => updateField("smoking", s)}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 12,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor:
                form.smoking === s ? colors.tint : colors.inputBackground,
              borderWidth: 1,
              borderColor:
                form.smoking === s ? colors.tint : colors.inputBorder,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: form.smoking === s ? "#fff" : colors.textSecondary,
                textTransform: "capitalize",
              }}
            >
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: colors.textSecondary,
          marginBottom: 8,
        }}
      >
        Alcohol Consumption
      </Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        {(["none", "light", "moderate", "heavy"] as const).map((a) => (
          <TouchableOpacity
            key={a}
            onPress={() => updateField("alcohol", a)}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 12,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor:
                form.alcohol === a ? colors.tint : colors.inputBackground,
              borderWidth: 1,
              borderColor:
                form.alcohol === a ? colors.tint : colors.inputBorder,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: form.alcohol === a ? "#fff" : colors.textSecondary,
                textTransform: "capitalize",
              }}
            >
              {a}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <InputField
        icon={<Text style={{ color: colors.textMuted, fontSize: 12 }}>Med</Text>}
        placeholder="Medical conditions (comma separated)"
        value={form.conditions}
        onChangeText={(v) => updateField("conditions", v)}
        colors={colors}
      />
    </>
  );

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
            height: 180,
            borderBottomLeftRadius: 40,
            borderBottomRightRadius: 40,
            justifyContent: "center",
            alignItems: "center",
            paddingTop: 50,
          }}
        >
          <Animated.View
            entering={FadeInDown.duration(800)}
            style={{
              width: 60,
              height: 60,
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.2)",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Heart size={30} color="#fff" fill="#fff" />
          </Animated.View>
          <Animated.Text
            entering={FadeInDown.delay(200).duration(800)}
            style={{
              fontSize: 24,
              fontWeight: "800",
              color: "#fff",
            }}
          >
            BPCare AI
          </Animated.Text>
        </LinearGradient>

        <View style={{ padding: 24, paddingTop: 28 }}>
          {step === 1 ? renderStep1() : renderStep2()}

          <Animated.View entering={FadeInUp.delay(300).duration(600)}>
            <TouchableOpacity
              onPress={handleNext}
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
                  marginTop: 8,
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
                      {step === 1 ? "Continue" : "Create Account"}
                    </Text>
                    <ArrowRight size={18} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            onPress={() => router.push("/(auth)/signin")}
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginTop: 24,
            }}
          >
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>
              Already have an account?{" "}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.tint,
                fontWeight: "700",
              }}
            >
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InputField({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  colors,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "email-address" | "numeric";
  autoCapitalize?: "none" | "sentences";
  colors: any;
}) {
  return (
    <View
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
      {icon}
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || "default"}
        autoCapitalize={autoCapitalize || "sentences"}
        style={{
          flex: 1,
          marginLeft: 12,
          fontSize: 16,
          color: colors.text,
          height: 56,
        }}
      />
    </View>
  );
}
