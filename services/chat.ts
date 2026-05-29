import { supabase } from "@/lib/supabase";
import { ChatMessage } from "@/context/ChatbotContext";

const NEURAL_ENGINE_URL = "https://mushte-bpcare-api.hf.space/chat";

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
  let intent = null;
  let sentiment = null;
  let detected_entities = null;
  let textToSave = message.text;

  // Intercept and query the Hugging Face engine when generating the assistant's response split
  if (message.role === "assistant") {
    try {
      const aiResponse = await fetch(NEURAL_ENGINE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: message.text, 
          user_id: userId,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        textToSave = aiData.reply; 
        intent = aiData.analysis?.intent || null;
        sentiment = aiData.analysis?.sentiment || null;
        detected_entities = aiData.analysis?.entities || null;
      } else {
        textToSave = "Pole sana! Mtandao wangu una shida kidogo. Hebu jaribu tena baada ya muda mfupi.";
      }
    } catch (err) {
      console.error("Failed to fetch response from Neural Engine:", err);
      textToSave = "Pole sana! Nimepata shida kidogo kuunganisha kwenye engine yangu.";
    }
  }

  // Insert into chat_messages table schema with enhanced analytical tracking columns
  const { data, error } = await (supabase
    .from("chat_messages") as any)
    .insert({
      user_id: userId,
      role: message.role,
      text: textToSave,
      intent: intent,
      sentiment: sentiment,
      detected_entities: detected_entities,
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