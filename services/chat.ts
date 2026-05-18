import { supabase } from "@/lib/supabase";
import { ChatMessage } from "@/context/ChatbotContext";

export async function getChatHistory(userId: string): Promise<ChatMessage[]> {
  const { data, error } = await (supabase
    .from("chat_messages") as any)
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: true })
    .limit(100);

  if (error) throw error;

  return (data || []).map((m: any) => ({
    id: m.id,
    role: m.role,
    text: m.text,
    timestamp: new Date(m.timestamp),
  }));
}

export async function saveChatMessage(
  userId: string,
  message: Omit<ChatMessage, "id" | "timestamp">
): Promise<ChatMessage> {
  const { data, error } = await (supabase
    .from("chat_messages") as any)
    .insert({
      user_id: userId,
      role: message.role,
      text: message.text,
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) throw error || new Error("Failed to save message");

  return {
    id: data.id,
    role: data.role,
    text: data.text,
    timestamp: new Date(data.timestamp),
  };
}

export async function clearChatHistory(userId: string) {
  const { error } = await (supabase
    .from("chat_messages") as any)
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
}
