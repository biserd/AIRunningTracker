import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { LoginResponse } from "../types";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing info", "Enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      await signIn(res.token, res.user);
      router.replace("/(tabs)");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Login failed. Try again.";
      Alert.alert("Couldn't sign in", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-12 pb-6 justify-center">
            <View className="mb-10">
              <Text className="text-4xl font-bold text-slate-900 dark:text-white">
                RunAnalytics
              </Text>
              <Text className="text-base text-slate-500 mt-2">
                Sign in to your account
              </Text>
            </View>

            <View className="gap-4">
              <View>
                <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor="#9ca3af"
                  className="border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3.5 text-base text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  className="border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3.5 text-base text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                />
              </View>

              <Pressable
                onPress={onSubmit}
                disabled={submitting}
                className="bg-strava rounded-xl py-4 items-center mt-2 active:opacity-80 disabled:opacity-50"
              >
                <Text className="text-white font-semibold text-base">
                  {submitting ? "Signing in…" : "Sign in"}
                </Text>
              </Pressable>

              <Text className="text-xs text-center text-slate-500 mt-4">
                Don't have an account? Create one at aitracker.run, then sign in here.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
