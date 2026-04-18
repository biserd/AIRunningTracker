import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiStreamChat } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import type { ChatMessage, Conversation } from "../../types";

export default function CoachScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  // Fetch / auto-create conversation
  const conversations = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: () => api<Conversation[]>(`/api/chat/conversations/${user!.id}`),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!user?.id || conversationId !== null) return;
    if (!conversations.data) return;
    if (conversations.data.length > 0) {
      // Use most recent conversation
      const sorted = [...conversations.data].sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime(),
      );
      setConversationId(sorted[0].id);
    } else {
      api<Conversation>("/api/chat/conversations", {
        method: "POST",
        body: JSON.stringify({ title: "Coach chat" }),
      })
        .then((c) => setConversationId(c.id))
        .catch((e) => Alert.alert("Couldn't start chat", (e as Error).message));
    }
  }, [conversations.data, user?.id, conversationId]);

  const messagesQ = useQuery({
    queryKey: ["chat-messages", conversationId],
    queryFn: () =>
      api<ChatMessage[]>(`/api/chat/${conversationId}/messages`),
    enabled: !!conversationId,
  });

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [messagesQ.data, streamingText]);

  const onSend = async () => {
    if (!conversationId || !input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    setStreamingText("");
    try {
      // Optimistically refetch (server saves the user message immediately)
      await apiStreamChat(
        `/api/chat/${conversationId}/messages`,
        { message: text },
        (chunk) => setStreamingText((s) => s + chunk),
      );
    } catch (e) {
      Alert.alert("Coach unavailable", (e as Error).message);
    } finally {
      setSending(false);
      setStreamingText("");
      qc.invalidateQueries({ queryKey: ["chat-messages", conversationId] });
    }
  };

  const newConversation = async () => {
    try {
      const c = await api<Conversation>("/api/chat/conversations", {
        method: "POST",
        body: JSON.stringify({ title: "Coach chat" }),
      });
      setConversationId(c.id);
      qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
    } catch (e) {
      Alert.alert("Couldn't start chat", (e as Error).message);
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3 border-b border-slate-200 dark:border-slate-800">
        <View>
          <Text className="text-xl font-bold text-slate-900 dark:text-white">
            AI Coach
          </Text>
          <Text className="text-xs text-slate-500">
            Ask about training, pace, recovery, plans
          </Text>
        </View>
        <Pressable
          onPress={newConversation}
          className="bg-slate-200 dark:bg-slate-800 px-3 py-2 rounded-lg active:opacity-80"
        >
          <Text className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            + New
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 10 }}
        >
          {messagesQ.isLoading || !conversationId ? (
            <View className="items-center mt-12">
              <ActivityIndicator color="#fc4c02" />
            </View>
          ) : (messagesQ.data?.length ?? 0) === 0 && !streamingText ? (
            <View className="items-center mt-16 px-8">
              <Text className="text-base text-slate-600 dark:text-slate-300 text-center">
                Hey! I'm your AI running coach.
              </Text>
              <Text className="text-sm text-slate-500 mt-2 text-center">
                Try: "How was my last run?" or "Suggest a workout for tomorrow"
              </Text>
            </View>
          ) : (
            messagesQ.data?.map((m) => <Bubble key={m.id} role={m.role} content={m.content} />)
          )}
          {streamingText ? <Bubble role="assistant" content={streamingText + " ▍"} /> : null}
          {sending && !streamingText ? (
            <View className="self-start bg-white dark:bg-slate-800 rounded-2xl px-4 py-3">
              <ActivityIndicator size="small" color="#fc4c02" />
            </View>
          ) : null}
        </ScrollView>

        <View className="flex-row items-end gap-2 px-3 pb-3 pt-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask your coach…"
            placeholderTextColor="#94a3b8"
            multiline
            className="flex-1 max-h-32 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-900 dark:text-white"
            editable={!sending}
          />
          <Pressable
            onPress={onSend}
            disabled={!input.trim() || sending}
            className={`px-4 py-3 rounded-2xl ${
              !input.trim() || sending ? "bg-slate-300 dark:bg-slate-700" : "bg-strava active:opacity-80"
            }`}
          >
            <Text className="text-white font-semibold">Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ role, content }: { role: string; content: string }) {
  const isUser = role === "user";
  return (
    <View
      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
        isUser ? "self-end bg-strava" : "self-start bg-white dark:bg-slate-800"
      }`}
    >
      <Text className={isUser ? "text-white" : "text-slate-900 dark:text-white"}>
        {content}
      </Text>
    </View>
  );
}
