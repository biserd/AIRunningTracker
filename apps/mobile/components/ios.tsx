import { ReactNode } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, shadow } from "../lib/theme";

/* ─── Top nav bar (iOS-style with back chevron) ──────────── */
export function NavBar({
  title,
  back,
  right,
}: {
  title: string;
  back?: string;
  right?: ReactNode;
}) {
  const router = useRouter();
  return (
    <View
      style={{
        height: 56,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 6,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
        backgroundColor: colors.bg,
      }}
    >
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 10,
          paddingVertical: 8,
          opacity: pressed ? 0.5 : 1,
        })}
        hitSlop={10}
      >
        <Text
          style={{
            color: colors.brand,
            fontSize: 22,
            fontWeight: "300",
            marginRight: 4,
            marginTop: -2,
          }}
        >
          ‹
        </Text>
        <Text style={{ color: colors.brand, fontSize: 16 }}>
          {back || "Back"}
        </Text>
      </Pressable>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          alignItems: "center",
          justifyContent: "center",
          height: 56,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            fontSize: 17,
            fontWeight: "600",
            color: colors.text,
            letterSpacing: -0.2,
          }}
        >
          {title}
        </Text>
      </View>
      <View style={{ marginLeft: "auto", paddingRight: 8 }}>{right}</View>
    </View>
  );
}

/* ─── Section label (UPPERCASE 13px) ─────────────────────── */
export function SectionLabel({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      style={[
        {
          fontSize: 13,
          fontWeight: "700",
          letterSpacing: 0.6,
          color: colors.muted,
          textTransform: "uppercase",
          marginLeft: 4,
          marginBottom: 8,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/* ─── Generic white card surface ─────────────────────────── */
export function Card({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: 18,
          borderWidth: 0.5,
          borderColor: colors.border,
          overflow: "hidden",
          ...shadow.card,
        },
        padded ? { padding: 16 } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ─── Big metric hero (52px value + label) ───────────────── */
export function MetricHero({
  label,
  value,
  unit,
  status,
  context,
}: {
  label: string;
  value: string;
  unit?: string;
  status?: { text: string; tone?: "success" | "warning" };
  context?: string;
}) {
  const tone = status?.tone || "success";
  const statusColor = tone === "warning" ? colors.warningText : colors.successText;
  const statusBg = tone === "warning" ? colors.warningBg : colors.successBg;
  return (
    <View style={{ paddingVertical: 4 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          letterSpacing: 1.0,
          color: colors.muted,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <Text
          style={{
            fontSize: 52,
            fontWeight: "700",
            color: colors.text,
            letterSpacing: -2,
            lineHeight: 56,
          }}
        >
          {value}
        </Text>
        {unit ? (
          <Text style={{ fontSize: 18, color: colors.muted, paddingBottom: 8 }}>
            {unit}
          </Text>
        ) : null}
      </View>
      {status ? (
        <View
          style={{
            alignSelf: "flex-start",
            backgroundColor: statusBg,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
            marginTop: 8,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "600", color: statusColor }}>
            {status.text}
          </Text>
        </View>
      ) : null}
      {context ? (
        <Text style={{ fontSize: 14, color: colors.muted, marginTop: 8, lineHeight: 20 }}>
          {context}
        </Text>
      ) : null}
    </View>
  );
}

/* ─── 3-up stat pills (CTL/ATL/TSB style) ────────────────── */
export function LoadPills({
  items,
}: {
  items: { label: string; value: string; sub?: string; color?: string }[];
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.border,
        borderRadius: 14,
        overflow: "hidden",
        gap: 1,
      }}
    >
      {items.map((it, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            paddingVertical: 14,
            paddingHorizontal: 12,
            gap: 3,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: 0.6,
              color: colors.muted,
              textTransform: "uppercase",
            }}
          >
            {it.label}
          </Text>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              letterSpacing: -0.5,
              color: it.color || colors.text,
            }}
          >
            {it.value}
          </Text>
          {it.sub ? (
            <Text style={{ fontSize: 11, color: colors.faint }}>{it.sub}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/* ─── Insight-style card with icon + category + body ─────── */
export function InsightCard({
  category,
  title,
  body,
  iconBg,
  glyph,
}: {
  category: string;
  title?: string;
  body?: string;
  iconBg?: string;
  glyph?: string;
}) {
  return (
    <Card style={{ padding: 14 }} padded={false}>
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
          {glyph ? (
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: iconBg || colors.surfaceAlt,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 16 }}>{glyph}</Text>
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                letterSpacing: 0.6,
                color: colors.muted,
                textTransform: "uppercase",
                marginBottom: 1,
              }}
            >
              {category}
            </Text>
            {title ? (
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: colors.text,
                  letterSpacing: -0.1,
                }}
              >
                {title}
              </Text>
            ) : null}
          </View>
        </View>
        {body ? (
          <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 21 }}>{body}</Text>
        ) : null}
      </View>
    </Card>
  );
}

/* ─── Full-width primary button (brand orange) ───────────── */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        width: "100%",
        backgroundColor: disabled ? colors.faint : colors.brand,
        paddingVertical: 15,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        opacity: pressed && !loading ? 0.85 : 1,
        minHeight: 50,
      })}
    >
      {loading ? <ActivityIndicator color="#fff" /> : null}
      <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16, letterSpacing: -0.1 }}>
        {loading ? "Signing in…" : label}
      </Text>
    </Pressable>
  );
}

/* ─── Danger / sign-out button (tinted brand) ───────────── */
export function DangerButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: "100%",
        paddingVertical: 14,
        backgroundColor: "rgba(252,76,2,0.06)",
        borderWidth: 0.5,
        borderColor: "rgba(252,76,2,0.25)",
        borderRadius: 14,
        alignItems: "center",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: colors.brand, fontWeight: "600", fontSize: 16 }}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ─── Pressable list row inside a Card group ─────────────── */
export function ListRow({
  icon,
  iconBg,
  title,
  subtitle,
  right,
  onPress,
  isLast,
}: {
  icon?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  isLast?: boolean;
}) {
  const inner = (pressed: boolean) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 16,
        gap: 14,
        borderBottomWidth: isLast ? 0 : 0.5,
        borderBottomColor: colors.border,
        backgroundColor: pressed ? colors.surfaceAlt : "transparent",
      }}
    >
      {icon ? (
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: iconBg || colors.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 18 }}>{icon}</Text>
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: colors.text,
            letterSpacing: -0.1,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {onPress ? (
        <Text style={{ color: colors.faint, fontSize: 18, fontWeight: "300" }}>›</Text>
      ) : null}
    </View>
  );
  if (!onPress) return inner(false);
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => inner(pressed)}
    </Pressable>
  );
}

/* ─── Status banner (green = ready, orange = caution) ────── */
export function StatusBanner({
  label,
  title,
  body,
  tone = "success",
}: {
  label: string;
  title: string;
  body?: string;
  tone?: "success" | "warning" | "danger";
}) {
  const bgMap = {
    success: "#2D7A1F",
    warning: "#C26020",
    danger: "#D9342B",
  } as const;
  return (
    <View
      style={{
        backgroundColor: bgMap[tone],
        borderRadius: 18,
        padding: 18,
        ...shadow.card,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 0.6,
          color: "rgba(255,255,255,0.85)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 24, fontWeight: "700", color: "#fff", marginTop: 4, letterSpacing: -0.4 }}>
        {title}
      </Text>
      {body ? (
        <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.92)", marginTop: 6, lineHeight: 20 }}>
          {body}
        </Text>
      ) : null}
    </View>
  );
}

/* ─── Premium gate card ──────────────────────────────────── */
export function PremiumGate({
  feature,
  description,
}: {
  feature: string;
  description?: string;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.premiumBg,
        borderWidth: 0.5,
        borderColor: "rgba(108,49,176,0.25)",
        borderRadius: 18,
        padding: 18,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.premium }}>
        {feature} is a Premium feature
      </Text>
      <Text style={{ fontSize: 14, color: colors.premium, marginTop: 6, opacity: 0.8, lineHeight: 20 }}>
        {description || "Upgrade on aitracker.run to unlock this."}
      </Text>
    </View>
  );
}

/* ─── Empty state ────────────────────────────────────────── */
export function EmptyState({
  title,
  body,
  icon,
  actionLabel,
  onAction,
  busy,
}: {
  title: string;
  body?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  actionLabel?: string;
  onAction?: () => void;
  busy?: boolean;
}) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 28 }}>
      {icon ? (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.brandLight,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
          }}
        >
          <Ionicons name={icon} size={26} color={colors.brand} />
        </View>
      ) : null}
      <Text
        style={{
          fontSize: 15,
          color: colors.ink,
          textAlign: "center",
          fontWeight: "600",
          letterSpacing: -0.1,
        }}
      >
        {title}
      </Text>
      {body ? (
        <Text
          style={{
            fontSize: 13,
            color: colors.muted,
            textAlign: "center",
            marginTop: 6,
            lineHeight: 19,
            maxWidth: 320,
          }}
        >
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          disabled={busy}
          style={({ pressed }) => ({
            marginTop: 16,
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: busy ? colors.faint : colors.brand,
            opacity: pressed ? 0.85 : 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          })}
        >
          {busy ? <ActivityIndicator color="#fff" size="small" /> : null}
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
            {busy ? "Syncing…" : actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
