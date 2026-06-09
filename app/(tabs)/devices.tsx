import { useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useBLE } from "@/context/BLEContext";
import { ArrowLeft, Bluetooth, BluetoothConnected, BluetoothSearching, Watch } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function DevicesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isScanning, connectedDevice, discoveredDevices, startScan, connectDevice, disconnectDevice } = useBLE();

  useEffect(() => {
    if (connectedDevice) {
      // Optionally stay on this screen so the user can see the connected device.
      // Navigation back is handled by the "Continue" button.
    }
  }, [connectedDevice]);

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        backgroundColor: colors.background,
        padding: 24,
        paddingBottom: 40,
      }}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <ArrowLeft size={22} color={colors.tint} />
        <Text style={{ marginLeft: 10, color: colors.tint, fontSize: 16, fontWeight: "700" }}>
          Back
        </Text>
      </TouchableOpacity>

      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Watch size={28} color={colors.tint} />
        <Text style={{ fontSize: 28, fontWeight: "800", color: colors.text, marginLeft: 12 }}>
          Devices
        </Text>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22, marginBottom: 24 }}>
        Scan nearby devices to connect a wearable. If your watch doesn’t appear, make sure Bluetooth is enabled on your phone and on the wearable.
      </Text>

      {connectedDevice ? (
        <View
          style={{
            backgroundColor: `${colors.success}10`,
            borderRadius: 24,
            padding: 20,
            borderWidth: 1,
            borderColor: `${colors.success}30`,
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <BluetoothConnected size={24} color={colors.success} />
            <View style={{ marginLeft: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
                {connectedDevice.name}
              </Text>
              <Text style={{ fontSize: 13, color: colors.success, fontWeight: "600", marginTop: 4 }}>
                Connected
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={disconnectDevice}
            style={{
              paddingVertical: 12,
              borderRadius: 16,
              backgroundColor: `${colors.danger}15`,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.danger, fontWeight: "700", fontSize: 14 }}>
              Disconnect
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(tabs)")}
            style={{ marginTop: 16 }}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              style={{ height: 52, borderRadius: 16, justifyContent: "center", alignItems: "center" }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                Continue to Dashboard
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity
            onPress={startScan}
            activeOpacity={0.85}
            style={{ marginBottom: 24 }}
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
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                Scan for Devices
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 24 }}>
            If Bluetooth is turned off, real devices will not appear.
            Scanning now includes Bluetooth devices that advertise watch and health services.
          </Text>
        </>
      )}

      {isScanning && (
        <View style={{ alignItems: "center", paddingVertical: 36 }}>
          <ActivityIndicator color={colors.tint} size="large" />
          <Text style={{ marginTop: 14, color: colors.textMuted, fontSize: 14, fontWeight: "500" }}>
            Scanning for smartwatches...
          </Text>
        </View>
      )}

      {!isScanning && !connectedDevice && discoveredDevices.length > 0 && (
        <View style={{ marginTop: 8 }}>
          {discoveredDevices.map((device) => (
            <TouchableOpacity
              key={device.id}
              onPress={() => connectDevice(device.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: colors.inputBackground,
                borderRadius: 18,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <BluetoothSearching size={20} color={colors.tint} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
                    {device.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    Signal: {device.rssi} dBm
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.tint }}>
                Connect
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
