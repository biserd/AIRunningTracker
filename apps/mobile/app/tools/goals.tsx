import { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { colors, shadow } from "../../lib/theme";
import {
  NavBar,
  SectionLabel,
  Card,
  PrimaryButton,
  EmptyState,
} from "../../components/ios";
import type { Goal } from "../../types";

const GOAL_TYPES = ["distance", "speed", "endurance", "hills", "consistency"] as const;

export default function GoalsScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newType, setNewType] = useState<(typeof GOAL_TYPES)[number]>("distance");

  const goals = useQuery({
    queryKey: ["goals", user?.id],
    queryFn: () => api<Goal[]>(`/api/goals/${user!.id}`),
    enabled: !!user?.id,
  });

  const createGoal = useMutation({
    mutationFn: () =>
      api<Goal>("/api/goals", {
        method: "POST",
        body: JSON.stringify({
          userId: user!.id,
          title: newTitle.trim(),
          description: newDesc.trim() || newTitle.trim(),
          type: newType,
          targetValue: newTarget.trim() || null,
          status: "active",
          source: "manual",
        }),
      }),
    onSuccess: () => {
      setNewTitle("");
      setNewDesc("");
      setNewTarget("");
      qc.invalidateQueries({ queryKey: ["goals", user?.id] });
    },
    onError: (e) => Alert.alert("Couldn't create goal", (e as Error).message),
  });

  const completeGoal = useMutation({
    mutationFn: (id: number) =>
      api<Goal>(`/api/goals/${id}/complete`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", user?.id] }),
    onError: (e) => Alert.alert("Failed", (e as Error).message),
  });

  const deleteGoal = useMutation({
    mutationFn: (id: number) => api<void>(`/api/goals/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", user?.id] }),
    onError: (e) => Alert.alert("Failed", (e as Error).message),
  });

  const active = goals.data?.filter((g) => g.status === "active") ?? [];
  const completed = goals.data?.filter((g) => g.status === "completed") ?? [];

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <NavBar title="Goals" back="Tools" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Card>
          <SectionLabel style={{ marginLeft: 0 }}>New Goal</SectionLabel>
          <TextInput
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="Title (e.g. Sub-25 5K)"
            placeholderTextColor={colors.faint}
            style={inputStyle}
          />
          <TextInput
            value={newDesc}
            onChangeText={setNewDesc}
            placeholder="Description (optional)"
            placeholderTextColor={colors.faint}
            style={[inputStyle, { marginTop: 8 }]}
          />
          <TextInput
            value={newTarget}
            onChangeText={setNewTarget}
            placeholder="Target value (e.g. 24:59)"
            placeholderTextColor={colors.faint}
            style={[inputStyle, { marginTop: 8 }]}
          />
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 12,
            }}
          >
            {GOAL_TYPES.map((t) => {
              const selected = newType === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setNewType(t)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 999,
                    backgroundColor: selected ? colors.brand : colors.surface,
                    borderWidth: 0.5,
                    borderColor: selected ? colors.brand : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: selected ? "#fff" : colors.text,
                      textTransform: "capitalize",
                    }}
                  >
                    {t}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ marginTop: 14 }}>
            <PrimaryButton
              label="Add goal"
              onPress={() => createGoal.mutate()}
              disabled={!newTitle.trim()}
              loading={createGoal.isPending}
            />
          </View>
        </Card>

        <SectionLabel>Active ({active.length})</SectionLabel>
        {goals.isLoading ? <ActivityIndicator color={colors.brand} /> : null}
        {active.length === 0 && !goals.isLoading ? (
          <EmptyState title="No active goals yet" />
        ) : (
          active.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onComplete={() => completeGoal.mutate(g.id)}
              onDelete={() => deleteGoal.mutate(g.id)}
            />
          ))
        )}

        {completed.length > 0 ? (
          <>
            <SectionLabel>Completed ({completed.length})</SectionLabel>
            {completed.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onDelete={() => deleteGoal.mutate(g.id)}
              />
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const inputStyle = {
  paddingHorizontal: 14,
  paddingVertical: 12,
  backgroundColor: colors.surfaceAlt,
  borderWidth: 0.5,
  borderColor: colors.border,
  borderRadius: 12,
  color: colors.text,
  fontSize: 15,
} as const;

function GoalCard({
  goal,
  onComplete,
  onDelete,
}: {
  goal: Goal;
  onComplete?: () => void;
  onDelete: () => void;
}) {
  const done = goal.status === "completed";
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 0.5,
        borderColor: colors.border,
        padding: 14,
        ...shadow.card,
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: done ? colors.faint : colors.text,
          textDecorationLine: done ? "line-through" : "none",
          letterSpacing: -0.2,
        }}
      >
        {goal.title}
      </Text>
      {goal.description && goal.description !== goal.title ? (
        <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
          {goal.description}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
        <Tag>{goal.type}</Tag>
        {goal.targetValue ? <Tag>🎯 {goal.targetValue}</Tag> : null}
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        {!done && onComplete ? (
          <Pressable
            onPress={onComplete}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: colors.successText,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: "center",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
              Mark complete
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => ({
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 10,
            borderWidth: 0.5,
            borderColor: "rgba(217,52,43,0.35)",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color: colors.danger, fontSize: 13, fontWeight: "600" }}>
            Delete
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: colors.surfaceAlt,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          color: colors.muted,
          textTransform: "uppercase",
          fontWeight: "600",
          letterSpacing: 0.4,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
