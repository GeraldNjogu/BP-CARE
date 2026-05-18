import createContextHook from "@nkzw/create-context-hook";
import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getChatHistory, saveChatMessage } from "@/services/chat";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
};

type ChatState = {
  messages: ChatMessage[];
  isTyping: boolean;
  sendMessage: (text: string) => Promise<void>;
};

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Hello! I'm your BPCare AI health assistant. I can help you understand your blood pressure trends, provide lifestyle recommendations, and answer health questions. How can I help you today?",
  timestamp: new Date(),
};

export const [ChatProvider, useChat] = createContextHook((): ChatState => {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setMessages([welcomeMessage]);
      return;
    }

    getChatHistory(user.id)
      .then((history) => {
        if (history.length > 0) {
          setMessages(history);
        }
      })
      .catch(() => {});
  }, [isAuthenticated, user]);

  const sendMessage = useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      if (user) {
        try {
          await saveChatMessage(user.id, { role: "user", text });
        } catch (err) {
          console.error("Failed to save user message:", err);
        }
      }

      setIsTyping(true);
      await new Promise((r) => setTimeout(r, 1200));

      const lower = text.toLowerCase();
      let reply = "";

      if (lower.includes("bp") || lower.includes("blood pressure") || lower.includes("150") || lower.includes("/")) {
        const bpMatch = text.match(/(\d{2,3})\/(\d{2,3})/);
        if (bpMatch) {
          const sys = parseInt(bpMatch[1], 10);
          const dia = parseInt(bpMatch[2], 10);
          reply = `I've logged your BP reading of ${sys}/${dia} mmHg. `;
          if (sys >= 140 || dia >= 90) {
            reply += "This falls in the Stage 2 Hypertension range. I recommend resting for 10 minutes and re-measuring. If it persists, consider contacting your healthcare provider.";
          } else if (sys >= 130 || dia >= 80) {
            reply += "This is in the Stage 1 Hypertension range. Monitor closely and maintain your healthy habits.";
          } else {
            reply += "This is within the normal range. Great job maintaining your cardiovascular health!";
          }
        } else {
          reply = "Your recent BP trend shows a slight improvement over the past week. The average systolic has decreased from 142 to 136 mmHg. Keep up your medication adherence and low-sodium diet.";
        }
      } else if (lower.includes("heart rate") || lower.includes("pulse") || lower.includes("bpm")) {
        reply = "Your resting heart rate has been averaging 72 BPM this week, which is within the healthy range (60-100 BPM). Your cardiovascular fitness is improving!";
      } else if (lower.includes("diet") || lower.includes("food") || lower.includes("eat") || lower.includes("sodium")) {
        reply = "For hypertension management, I recommend the DASH diet: plenty of fruits, vegetables, whole grains, and lean proteins. Limit sodium to under 1,500mg per day. Foods rich in potassium like bananas, spinach, and sweet potatoes can help lower BP naturally.";
      } else if (lower.includes("exercise") || lower.includes("workout") || lower.includes("activity")) {
        reply = "Aim for at least 150 minutes of moderate aerobic activity per week (like brisk walking or swimming). Strength training twice a week also helps. Remember to monitor your BP before and after exercise, and avoid heavy lifting if your reading is above 180/110.";
      } else if (lower.includes("stress") || lower.includes("anxiety") || lower.includes("sleep")) {
        reply = "Stress management is crucial for BP control. Try deep breathing exercises (4-7-8 technique), meditation apps, or yoga. Aim for 7-9 hours of quality sleep. Poor sleep can raise cortisol levels and increase BP.";
      } else if (lower.includes("medication") || lower.includes("pill") || lower.includes("drug")) {
        reply = "Medication adherence is key to controlling hypertension. Take your prescriptions at the same time daily. Never skip doses or stop without consulting your doctor. If you experience side effects, contact your healthcare provider immediately.";
      } else {
        reply = "Thank you for sharing that. Based on your health profile, I recommend keeping a consistent measurement schedule (morning and evening), maintaining your current medication plan, and focusing on stress reduction techniques. Would you like specific advice on diet, exercise, or sleep?";
      }

      const assistantMsg: ChatMessage = {
        id: `reply-${Date.now()}`,
        role: "assistant",
        text: reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);

      if (user) {
        try {
          await saveChatMessage(user.id, { role: "assistant", text: reply });
        } catch (err) {
          console.error("Failed to save assistant message:", err);
        }
      }
    },
    [user]
  );

  return { messages, isTyping, sendMessage };
});
