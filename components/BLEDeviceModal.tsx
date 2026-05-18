import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useBLE } from "@/context/BLEContext";
import { X, Bluetooth, BluetoothConnected, BluetoothSearching } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";

export default function BLEDeviceModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const {
    isScanning,
    connectedDevice,
    discoveredDevices,
    startScan,
    connectDevice,
    disconnectDevice,
  } = useBLE();

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
              Wearable Devices
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {connectedDevice && (
            <Animated.View
              entering={FadeIn}
              style={{
                backgroundColor: `${colors.success}10`,
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: `${colors.success}30`,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <BluetoothConnected size={22} color={colors.success} />
                  <View style={{ marginLeft: 12 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: colors.text,
                      }}
                    >
                      {connectedDevice.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.success,
                        fontWeight: "600",
                        marginTop: 2,
                      }}
                    >
                      Connected
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={disconnectDevice}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: `${colors.danger}15`,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: colors.danger,
                    }}
                  >
                    Disconnect
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {!isScanning && !connectedDevice && (
            <TouchableOpacity
              onPress={startScan}
              activeOpacity={0.85}
              style={{ marginBottom: 16 }}
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
                <Bluetooth size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: "700",
                  }}
                >
                  Scan for Devices
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {isScanning && (
            <View
              style={{
                justifyContent: "center",
                alignItems: "center",
                paddingVertical: 32,
              }}
            >
              <ActivityIndicator color={colors.tint} size="large" />
              <Text
                style={{
                  marginTop: 12,
                  fontSize: 14,
                  color: colors.textSecondary,
                  fontWeight: "500",
                }}
              >
                Scanning for smartwatches...
              </Text>
            </View>
          )}

          {!isScanning &&
            discoveredDevices.map((device) => (
              <TouchableOpacity
                key={device.id}
                onPress={() => connectDevice(device.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.inputBackground,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <BluetoothSearching size={20} color={colors.tint} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: colors.text,
                    }}
                  >
                    {device.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textMuted,
                      marginTop: 2,
                    }}
                  >
                    Signal: {device.rssi} dBm
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: colors.tint,
                  }}
                >
                  Connect
                </Text>
              </TouchableOpacity>
            ))}
        </View>
      </View>
    </Modal>
  );
}
