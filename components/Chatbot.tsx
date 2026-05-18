import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useChat } from "@/context/ChatbotContext";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Mic,
  Sparkles,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

const suggestedPrompts = [
  "My BP was 145/92 today",
  "How can I lower my BP?",
  "What does my trend show?",
  "Diet tips for hypertension",
];

export default function FloatingChatbot() {
  const { colors } = useTheme();
  const { messages, isTyping, sendMessage } = useChat();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const fabScale = useSharedValue(1);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, open]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  };

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  return (
    <>
      {!open && (
        <Animated.View
          style={[
            {
              position: "absolute",
              bottom: 100,
              right: 20,
              zIndex: 100,
            },
            fabAnimatedStyle,
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              fabScale.value = withSequence(
                withTiming(0.9, { duration: 100 }),
                withSpring(1)
              );
              setOpen(true);
            }}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                justifyContent: "center",
                alignItems: "center",
                shadowColor: colors.tint,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <MessageCircle size={28} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: colors.overlay,
              justifyContent: "flex-end",
            }}
          >
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => setOpen(false)}
            />
            <View
              style={{
                height: height * 0.75,
                backgroundColor: colors.card,
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                style={{
                  paddingHorizontal: 20,
                  paddingTop: 16,
                  paddingBottom: 16,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor: "rgba(255,255,255,0.2)",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 10,
                    }}
                  >
                    <Bot size={20} color="#fff" />
                  </View>
                  <View>
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 16,
                        fontWeight: "700",
                      }}
                    >
                      BPCare AI Assistant
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 2,
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: "#32E0C4",
                          marginRight: 6,
                        }}
                      />
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.85)",
                          fontSize: 12,
                        }}
                      >
                        {isTyping ? "Thinking..." : "Online"}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setOpen(false)}>
                  <X size={24} color="#fff" />
                </TouchableOpacity>
              </LinearGradient>

              <ScrollView
                ref={scrollRef}
                style={{ flex: 1, padding: 16 }}
                contentContainerStyle={{ paddingBottom: 16 }}
                onContentSizeChange={() =>
                  scrollRef.current?.scrollToEnd({ animated: true })
                }
              >
                {messages.map((msg, idx) => (
                  <View
                    key={msg.id}
                    style={{
                      flexDirection: msg.role === "user" ? "row-reverse" : "row",
                      marginBottom: 12,
                      alignItems: "flex-end",
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 10,
                        backgroundColor:
                          msg.role === "user"
                            ? colors.tint
                            : `${colors.tint}15`,
                        justifyContent: "center",
                        alignItems: "center",
                        marginHorizontal: 6,
                      }}
                    >
                      {msg.role === "user" ? (
                        <User size={14} color="#fff" />
                      ) : (
                        <Sparkles size={14} color={colors.tint} />
                      )}
                    </View>
                    <View
                      style={{
                        maxWidth: "75%",
                        backgroundColor:
                          msg.role === "user" ? colors.tint : colors.inputBackground,
                        borderRadius: 16,
                        borderBottomRightRadius: msg.role === "user" ? 4 : 16,
                        borderBottomLeftRadius: msg.role === "assistant" ? 4 : 16,
                        padding: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          lineHeight: 20,
                          color:
                            msg.role === "user" ? "#fff" : colors.text,
                        }}
                      >
                        {msg.text}
                      </Text>
                    </View>
                  </View>
                ))}

                {isTyping && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-end",
                      marginBottom: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 10,
                        backgroundColor: `${colors.tint}15`,
                        justifyContent: "center",
                        alignItems: "center",
                        marginHorizontal: 6,
                      }}
                    >
                      <Sparkles size={14} color={colors.tint} />
                    </View>
                    <View
                      style={{
                        backgroundColor: colors.inputBackground,
                        borderRadius: 16,
                        borderBottomLeftRadius: 4,
                        padding: 12,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: colors.textMuted,
                          marginRight: 4,
                        }}
                      />
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: colors.textMuted,
                          marginRight: 4,
                        }}
                      />
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: colors.textMuted,
                        }}
                      />
                    </View>
                  </View>
                )}

                {messages.length === 1 && (
                  <View style={{ marginTop: 8 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textMuted,
                        marginBottom: 8,
                        marginLeft: 40,
                      }}
                    >
                      Suggested questions:
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        marginLeft: 40,
                        gap: 8,
                      }}
                    >
                      {suggestedPrompts.map((prompt) => (
                        <TouchableOpacity
                          key={prompt}
                          onPress={() => {
                            sendMessage(prompt);
                          }}
                          style={{
                            backgroundColor: colors.inputBackground,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              color: colors.tint,
                              fontWeight: "500",
                            }}
                          >
                            {prompt}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>

              <View
                style={{
                  padding: 12,
                  paddingBottom: Platform.OS === "ios" ? 28 : 16,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  backgroundColor: colors.card,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <TouchableOpacity
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: colors.inputBackground,
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 8,
                  }}
                >
                  <Mic size={18} color={colors.textMuted} />
                </TouchableOpacity>
                <TextInput
                  placeholder="Ask about your health..."
                  placeholderTextColor={colors.textMuted}
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={handleSend}
                  style={{
                    flex: 1,
                    height: 44,
                    backgroundColor: colors.inputBackground,
                    borderRadius: 22,
                    paddingHorizontal: 16,
                    fontSize: 14,
                    color: colors.text,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                />
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={!input.trim() || isTyping}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: input.trim() ? colors.tint : colors.border,
                    justifyContent: "center",
                    alignItems: "center",
                    marginLeft: 8,
                  }}
                >
                  <Send size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
