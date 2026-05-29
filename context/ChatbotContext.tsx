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
      if (!text.trim()) return;

      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        text,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      if (user) {
        try {
          // 1. Commit raw user message to database
          await saveChatMessage(user.id, { role: "user", text });

          // 2. Fetch processed reply text data directly out of the Neural Engine
          const botResult = await saveChatMessage(user.id, { role: "assistant", text });

          const assistantMsg: ChatMessage = {
            id: botResult.id,
            role: "assistant",
            text: botResult.text, 
            timestamp: botResult.timestamp,
          };

          setMessages((prev) => [...prev, assistantMsg]);
        } catch (err) {
          console.error("Failed executing dynamic remote chat workflows:", err);
        } finally {
          setIsTyping(false);
        }
      } else {
        setIsTyping(false);
      }
    },
    [user]
  );

  return { messages, isTyping, sendMessage };
});