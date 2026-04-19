import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { colors } from "../lib/theme";
import { PrimaryButton } from "../components/ios";
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              flex: 1,
              paddingHorizontal: 24,
              paddingTop: 48,
              paddingBottom: 24,
              justifyContent: "center",
            }}
          >
            <View style={{ marginBottom: 36 }}>
              <Text
                style={{
                  fontSize: 38,
                  fontWeight: "700",
                  color: colors.text,
                  letterSpacing: -1,
                }}
              >
                <Text style={{ color: colors.brand }}>Run</Text>Analytics
              </Text>
              <Text style={{ fontSize: 16, color: colors.muted, marginTop: 8 }}>
                Sign in to your account
              </Text>
            </View>

            <View style={{ gap: 16 }}>
              <Field label="Email">
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor={colors.faint}
                  style={inputStyle}
                />
              </Field>

              <Field label="Password">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                  placeholder="••••••••"
                  placeholderTextColor={colors.faint}
                  style={inputStyle}
                />
              </Field>

              <View style={{ marginTop: 8 }}>
                <PrimaryButton
                  label="Sign in"
                  onPress={onSubmit}
                  loading={submitting}
                />
              </View>

              <Text
                style={{
                  fontSize: 13,
                  textAlign: "center",
                  color: colors.muted,
                  marginTop: 12,
                  lineHeight: 19,
                }}
              >
                Don't have an account? Create one at aitracker.run, then sign in here.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: colors.muted,
          marginBottom: 6,
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

const inputStyle = {
  borderWidth: 0.5,
  borderColor: colors.border,
  backgroundColor: colors.surface,
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 16,
  color: colors.text,
} as const;
