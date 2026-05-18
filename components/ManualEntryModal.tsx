import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useBLE } from "@/context/BLEContext";
import { X, Save } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function ManualEntryModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { addManualReading } = useBLE();
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");

  const handleSave = () => {
    const sys = parseInt(systolic, 10);
    const dia = parseInt(diastolic, 10);
    const hr = parseInt(heartRate, 10);
    if (!sys || !dia || !hr) return;
    addManualReading(sys, dia, hr);
    setSystolic("");
    setDiastolic("");
    setHeartRate("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 24,
            padding: 24,
            width: "100%",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: colors.text,
              }}
            >
              Manual Entry
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {[
            { label: "Systolic BP", value: systolic, set: setSystolic, unit: "mmHg" },
            { label: "Diastolic BP", value: diastolic, set: setDiastolic, unit: "mmHg" },
            { label: "Heart Rate", value: heartRate, set: setHeartRate, unit: "BPM" },
          ].map((field) => (
            <View key={field.label} style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.textSecondary,
                  marginBottom: 6,
                }}
              >
                {field.label}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.inputBackground,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  borderWidth: 1,
                  borderColor: colors.inputBorder,
                  height: 52,
                }}
              >
                <TextInput
                  placeholder={`0 ${field.unit}`}
                  placeholderTextColor={colors.textMuted}
                  value={field.value}
                  onChangeText={field.set}
                  keyboardType="numeric"
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: colors.text,
                    height: 52,
                  }}
                />
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  {field.unit}
                </Text>
              </View>
            </View>
          ))}

          <TouchableOpacity onPress={handleSave} activeOpacity={0.85}>
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              style={{
                height: 52,
                borderRadius: 16,
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "row",
                marginTop: 8,
              }}
            >
              <Save size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "700",
                }}
              >
                Save Reading
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
