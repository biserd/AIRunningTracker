import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { colors, shadow } from "../lib/theme";
import { PrimaryButton } from "../components/ios";
import type { LoginResponse } from "../types";

type Mode = "signin" | "signup";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>("signin");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    const trimmedEmail = email.trim();

    if (mode === "signup") {
      if (!firstName.trim() || !lastName.trim()) {
        toast.show("Tell us your name to create your account.", "error");
        return;
      }
      if (!trimmedEmail || !password) {
        toast.show("Enter your email and a password.", "error");
        return;
      }
      if (password.length < 6) {
        toast.show("Password must be at least 6 characters.", "error");
        return;
      }
    } else {
      if (!trimmedEmail || !password) {
        toast.show("Enter your email and password.", "error");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === "signup") {
        const res = await api<LoginResponse>("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email: trimmedEmail,
            password,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
          }),
        });
        await signIn(res.token, res.user);
        router.replace("/(tabs)");
        // Show welcome after navigation so it lands on the Home screen.
        setTimeout(
          () =>
            toast.show(
              "Welcome to RunAnalytics — 7 days of Premium are on us.",
              "success",
            ),
          250,
        );
      } else {
        const res = await api<LoginResponse>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: trimmedEmail, password }),
        });
        await signIn(res.token, res.user);
        router.replace("/(tabs)");
      }
    } catch (err) {
      const fallback =
        mode === "signup" ? "Couldn't create account." : "Couldn't sign in.";
      const msg = err instanceof ApiError ? err.message : fallback;
      toast.show(msg || fallback, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const isSignup = mode === "signup";

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
            {/* Brand */}
            <View style={{ marginBottom: 24 }}>
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
              <Text style={{ fontSize: 15, color: colors.muted, marginTop: 8 }}>
                {isSignup
                  ? "Start your 7-day free trial. No card required."
                  : "Sign in to your account"}
              </Text>
            </View>

            {/* Segmented control */}
            <SegmentedControl mode={mode} onChange={setMode} />

            {/* Trial banner — only on Sign Up */}
            {isSignup ? <TrialBanner /> : null}

            {/* Form */}
            <View style={{ gap: 14, marginTop: 18 }}>
              {isSignup ? (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Field label="First name">
                      <TextInput
                        value={firstName}
                        onChangeText={setFirstName}
                        autoCapitalize="words"
                        autoComplete="given-name"
                        placeholder="Alex"
                        placeholderTextColor={colors.faint}
                        style={inputStyle}
                      />
                    </Field>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Last name">
                      <TextInput
                        value={lastName}
                        onChangeText={setLastName}
                        autoCapitalize="words"
                        autoComplete="family-name"
                        placeholder="Runner"
                        placeholderTextColor={colors.faint}
                        style={inputStyle}
                      />
                    </Field>
                  </View>
                </View>
              ) : null}

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
                  autoComplete={isSignup ? "new-password" : "password"}
                  placeholder={isSignup ? "At least 6 characters" : "••••••••"}
                  placeholderTextColor={colors.faint}
                  style={inputStyle}
                />
              </Field>

              <View style={{ marginTop: 8 }}>
                <PrimaryButton
                  label={isSignup ? "Start free trial" : "Sign in"}
                  onPress={onSubmit}
                  loading={submitting}
                />
              </View>

              <Text
                style={{
                  fontSize: 12.5,
                  textAlign: "center",
                  color: colors.faint,
                  marginTop: 10,
                  lineHeight: 18,
                  paddingHorizontal: 8,
                }}
              >
                {isSignup
                  ? "By creating an account you agree to our terms. You can cancel anytime — there's no card on file."
                  : "Forgot your password? Reset it on aitracker.run."}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─── Segmented control ─────────────────────────────── */
function SegmentedControl({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.surfaceAlt,
        borderRadius: 12,
        padding: 4,
        gap: 4,
      }}
    >
      <SegmentBtn
        label="Sign in"
        active={mode === "signin"}
        onPress={() => onChange("signin")}
      />
      <SegmentBtn
        label="Create account"
        active={mode === "signup"}
        onPress={() => onChange("signup")}
      />
    </View>
  );
}

function SegmentBtn({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        paddingVertical: 10,
        borderRadius: 9,
        backgroundColor: active ? colors.surface : "transparent",
        alignItems: "center",
        opacity: pressed && !active ? 0.7 : 1,
        ...(active ? shadow.card : {}),
      })}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: active ? "600" : "500",
          color: active ? colors.ink : colors.muted,
          letterSpacing: -0.1,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ─── Trial banner ───────────────────────────────────── */
function TrialBanner() {
  return (
    <View
      style={{
        marginTop: 16,
        backgroundColor: colors.brandLight,
        borderRadius: 14,
        padding: 14,
        flexDirection: "row",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
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
        <Ionicons name="sparkles" size={16} color="#fff" />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink, letterSpacing: -0.1 }}>
          7 days of Premium, free
        </Text>
        <Text style={{ fontSize: 12.5, color: colors.ink2, lineHeight: 17 }}>
          Includes Injury Risk, Coach Recaps, Form Stability, and the AI Coach.
          No card required.
        </Text>
      </View>
    </View>
  );
}

/* ─── Form field ─────────────────────────────────────── */
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
