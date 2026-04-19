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
import { colors } from "../../lib/theme";
import type { ChatMessage, Conversation } from "../../types";

export default function CoachScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const conversations = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: () => api<Conversation[]>(`/api/chat/conversations/${user!.id}`),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!user?.id || conversationId !== null) return;
    if (!conversations.data) return;
    if (conversations.data.length > 0) {
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
    queryFn: () => api<ChatMessage[]>(`/api/chat/${conversationId}/messages`),
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
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Nav header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 6,
          paddingBottom: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
          backgroundColor: colors.bg,
        }}
      >
        <View>
          <Text style={{ fontSize: 22, fontWeight: "700", color: colors.ink, letterSpacing: -0.4 }}>
            AI Coach
          </Text>
          <Text style={{ fontSize: 13, color: colors.ink2, marginTop: 2 }}>
            Trained on your runs
          </Text>
        </View>
        <Pressable
          onPress={newConversation}
          style={({ pressed }) => ({
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.line,
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 10,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink }}>+ New</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, paddingBottom: 16, gap: 12 }}
        >
          {messagesQ.isLoading || !conversationId ? (
            <View style={{ alignItems: "center", marginTop: 48 }}>
              <ActivityIndicator color={colors.brand} />
            </View>
          ) : (messagesQ.data?.length ?? 0) === 0 && !streamingText ? (
            <EmptyState onPick={(p) => setInput(p)} />
          ) : (
            messagesQ.data?.map((m) => (
              <Bubble key={m.id} role={m.role} content={m.content} />
            ))
          )}
          {streamingText ? <Bubble role="assistant" content={streamingText + " ▍"} /> : null}
          {sending && !streamingText ? (
            <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
              <Avatar />
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                  borderRadius: 18,
                  borderTopLeftRadius: 4,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <ActivityIndicator size="small" color={colors.brand} />
              </View>
            </View>
          ) : null}
        </ScrollView>

        {/* Input bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: 12,
            borderTopWidth: 0.5,
            borderTopColor: colors.border,
            backgroundColor: "rgba(255,255,255,0.96)",
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask your coach…"
            placeholderTextColor={colors.faint}
            multiline
            style={{
              flex: 1,
              maxHeight: 120,
              backgroundColor: colors.surface,
              borderWidth: 0.5,
              borderColor: colors.border,
              borderRadius: 22,
              paddingHorizontal: 16,
              paddingVertical: Platform.OS === "ios" ? 11 : 8,
              fontSize: 15,
              color: colors.text,
            }}
            editable={!sending}
          />
          <Pressable
            onPress={onSend}
            disabled={!input.trim() || sending}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: !input.trim() || sending ? colors.faint : colors.brand,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginTop: -1 }}>
              ↑
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Avatar() {
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.brand,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>R</Text>
    </View>
  );
}

function Bubble({ role, content }: { role: string; content: string }) {
  const isUser = role === "user";
  if (isUser) {
    return (
      <View style={{ alignSelf: "flex-end", maxWidth: "75%" }}>
        <View
          style={{
            backgroundColor: colors.brand,
            borderRadius: 18,
            borderBottomRightRadius: 4,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 15,
              fontWeight: "500",
              lineHeight: 21,
              flexShrink: 1,
            }}
          >
            {content}
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        alignItems: "flex-start",
        maxWidth: "90%",
        alignSelf: "flex-start",
      }}
    >
      <Avatar />
      <View
        style={{
          flex: 1,
          flexShrink: 1,
          backgroundColor: colors.surface,
          borderRadius: 18,
          borderTopLeftRadius: 4,
          paddingHorizontal: 16,
          paddingVertical: 14,
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowOffset: { width: 0, height: 1 },
          shadowRadius: 6,
          elevation: 1,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: colors.brand,
            letterSpacing: 0.3,
            marginBottom: 6,
          }}
        >
          RunAnalytics Coach
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: colors.ink,
            lineHeight: 23,
            flexShrink: 1,
          }}
        >
          {content}
        </Text>
      </View>
    </View>
  );
}

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  const prompts = [
    "How was my last run?",
    "Suggest a workout for tomorrow",
    "How aggressive should my long run be this weekend?",
  ];
  return (
    <View style={{ alignItems: "center", paddingTop: 48, paddingHorizontal: 16 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.brand,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700" }}>R</Text>
      </View>
      <Text style={{ fontSize: 17, fontWeight: "600", color: colors.text, marginBottom: 4 }}>
        Hey, I'm your AI running coach.
      </Text>
      <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", marginBottom: 18 }}>
        Tap a prompt to start, or type your own below.
      </Text>
      <View style={{ width: "100%", gap: 8 }}>
        {prompts.map((p) => (
          <Pressable
            key={p}
            onPress={() => onPick(p)}
            style={({ pressed }) => ({
              backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
              borderWidth: 0.5,
              borderColor: colors.border,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            })}
          >
            <Text style={{ fontSize: 16, color: colors.brand }}>›</Text>
            <Text style={{ flex: 1, fontSize: 14, color: colors.textSoft }}>{p}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
