import React, { useState } from "react";
// 1. Make sure 'Alert' is included in your react-native imports here:
import { View, Text, Modal, TouchableOpacity, TextInput, Alert } from "react-native"; 
import { useTheme } from "@/context/ThemeContext";
import { X, Plus, Trash2 } from "lucide-react-native";

export default function MedicationTimeModal({
  visible,
  onClose,
  savedTimes,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  savedTimes: string[];
  onSave: (times: string[]) => void;
}) {
  const { colors } = useTheme();
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");

  const handleAddTime = () => {
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);

    // 2. Change the raw web 'alert' to the mobile 'Alert.alert' component:
    if (isNaN(h) || h < 0 || h > 23 || isNaN(m) || m < 0 || m > 59) {
      Alert.alert("Invalid Time", "Please enter a valid time (HH: 0-23, MM: 0-59)");
      return;
    }

    const formattedTime = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
    if (!savedTimes.includes(formattedTime)) {
      const updated = [...savedTimes, formattedTime].sort();
      onSave(updated);
    }
    setHour("");
    setMinute("");
  };

  const handleRemoveTime = (timeToRemove: string) => {
    const updated = savedTimes.filter((t) => t !== timeToRemove);
    onSave(updated);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "80%" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text }}>Medication Schedules</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={colors.textMuted} /></TouchableOpacity>
          </View>

          {/* Time Entry Form */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <TextInput
              placeholder="HH"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              maxLength={2}
              value={hour}
              onChangeText={setHour}
              style={{ flex: 1, backgroundColor: colors.inputBackground, color: colors.text, padding: 12, borderRadius: 12, textAlign: "center", fontSize: 18, borderWidth: 1, borderColor: colors.border }}
            />
            <Text style={{ fontSize: 20, color: colors.text, fontWeight: "700" }}>:</Text>
            <TextInput
              placeholder="MM"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              maxLength={2}
              value={minute}
              onChangeText={setMinute}
              style={{ flex: 1, backgroundColor: colors.inputBackground, color: colors.text, padding: 12, borderRadius: 12, textAlign: "center", fontSize: 18, borderWidth: 1, borderColor: colors.border }}
            />
            <TouchableOpacity onPress={handleAddTime} style={{ backgroundColor: colors.tint, width: 48, height: 48, padding: 12, borderRadius: 12, justifyContent: "center", alignItems: "center" }}>
              <Plus size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* List of active reminders */}
          {savedTimes.length === 0 ? (
            <Text style={{ color: colors.textMuted, textAlign: "center", marginVertical: 20 }}>No reminder schedules set yet.</Text>
          ) : (
            savedTimes.map((time) => (
              <View key={time} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>{time}</Text>
                <TouchableOpacity onPress={() => handleRemoveTime(time)}><Trash2 size={18} color={colors.danger} /></TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </View>
    </Modal>
  );
}