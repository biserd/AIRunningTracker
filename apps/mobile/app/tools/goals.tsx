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
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Goals",
          headerStyle: { backgroundColor: "#fc4c02" },
          headerTintColor: "#fff",
        }}
      />
      <SafeAreaView edges={["bottom"]} className="flex-1 bg-slate-50 dark:bg-slate-900">
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <Text className="text-xs uppercase tracking-wide text-slate-400 mb-3">
              New goal
            </Text>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Title (e.g. Sub-25 5K)"
              placeholderTextColor="#94a3b8"
              className="px-3 py-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
            <TextInput
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="Description (optional)"
              placeholderTextColor="#94a3b8"
              className="px-3 py-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white mt-2"
            />
            <TextInput
              value={newTarget}
              onChangeText={setNewTarget}
              placeholder="Target value (e.g. 24:59)"
              placeholderTextColor="#94a3b8"
              className="px-3 py-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white mt-2"
            />
            <View className="flex-row flex-wrap gap-2 mt-3">
              {GOAL_TYPES.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setNewType(t)}
                  className={`px-3 py-1.5 rounded-full border ${
                    newType === t
                      ? "border-strava bg-strava"
                      : "border-slate-300 dark:border-slate-600"
                  } active:opacity-80`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      newType === t ? "text-white" : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              disabled={!newTitle.trim() || createGoal.isPending}
              onPress={() => createGoal.mutate()}
              className={`mt-4 rounded-xl py-3 items-center ${
                !newTitle.trim() || createGoal.isPending
                  ? "bg-slate-300 dark:bg-slate-700"
                  : "bg-strava active:opacity-80"
              }`}
            >
              {createGoal.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold">Add goal</Text>
              )}
            </Pressable>
          </View>

          <Text className="text-xs uppercase tracking-wide text-slate-400 mt-2">
            Active ({active.length})
          </Text>
          {goals.isLoading ? <ActivityIndicator color="#fc4c02" /> : null}
          {active.length === 0 && !goals.isLoading ? (
            <Text className="text-sm text-slate-500">No active goals yet.</Text>
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
              <Text className="text-xs uppercase tracking-wide text-slate-400 mt-3">
                Completed ({completed.length})
              </Text>
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
    </>
  );
}

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
    <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text
            className={`text-base font-semibold ${
              done
                ? "text-slate-400 line-through"
                : "text-slate-900 dark:text-white"
            }`}
          >
            {goal.title}
          </Text>
          {goal.description && goal.description !== goal.title ? (
            <Text className="text-xs text-slate-500 mt-1">{goal.description}</Text>
          ) : null}
          <View className="flex-row gap-2 mt-2">
            <Tag>{goal.type}</Tag>
            {goal.targetValue ? <Tag>🎯 {goal.targetValue}</Tag> : null}
          </View>
        </View>
      </View>
      <View className="flex-row gap-2 mt-3">
        {!done && onComplete ? (
          <Pressable
            onPress={onComplete}
            className="flex-1 py-2 rounded-lg bg-green-500 items-center active:opacity-80"
          >
            <Text className="text-white text-xs font-semibold">Mark complete</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onDelete}
          className="px-4 py-2 rounded-lg border border-red-200 dark:border-red-900 active:opacity-80"
        >
          <Text className="text-red-600 text-xs font-semibold">Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <View className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700">
      <Text className="text-[10px] text-slate-600 dark:text-slate-300 uppercase">
        {children}
      </Text>
    </View>
  );
}
