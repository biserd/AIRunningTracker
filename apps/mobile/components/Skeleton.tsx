import { useEffect, useRef } from "react";
import { Animated, Easing, View, type ViewStyle, type StyleProp } from "react-native";
import { colors, shadow } from "../lib/theme";

export function Skeleton({
  width,
  height,
  radius = 8,
  style,
}: {
  width?: ViewStyle["width"];
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: "#E8E5DD",
          opacity,
        },
        style,
      ]}
    />
  );
}

export function HeroSkeleton() {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 20,
        borderWidth: 0.5,
        borderColor: colors.line,
        padding: 24,
        gap: 14,
        ...shadow.card,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Skeleton width={88} height={12} />
        <Skeleton width={120} height={22} radius={11} />
      </View>
      <View style={{ flexDirection: "row", gap: 24, marginTop: 4 }}>
        <View style={{ gap: 8 }}>
          <Skeleton width={64} height={28} />
          <Skeleton width={32} height={11} />
        </View>
        <View style={{ gap: 8 }}>
          <Skeleton width={56} height={28} />
          <Skeleton width={32} height={11} />
        </View>
        <View style={{ gap: 8 }}>
          <Skeleton width={72} height={28} />
          <Skeleton width={32} height={11} />
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: colors.line, marginTop: 6 }} />
      <Skeleton width="35%" height={11} />
      <Skeleton width="92%" height={14} />
      <Skeleton width="78%" height={14} />
    </View>
  );
}

export function StatusDuoSkeleton() {
  return (
    <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
      <View style={skelCard}>
        <Skeleton width={70} height={11} />
        <Skeleton width={48} height={28} style={{ marginTop: 12 }} />
        <Skeleton width={84} height={20} radius={999} style={{ marginTop: 8 }} />
      </View>
      <View style={skelCard}>
        <Skeleton width={70} height={11} />
        <Skeleton width={48} height={28} style={{ marginTop: 12 }} />
        <Skeleton width={84} height={20} radius={999} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function RowSkeleton() {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        ...shadow.card,
      }}
    >
      <Skeleton width={42} height={42} radius={12} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={11} />
      </View>
      <View style={{ alignItems: "flex-end", gap: 7 }}>
        <Skeleton width={64} height={16} />
        <Skeleton width={44} height={11} />
      </View>
    </View>
  );
}

export function CardSkeleton({ height = 180 }: { height?: number }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 20,
        gap: 14,
        ...shadow.card,
      }}
    >
      <Skeleton width="40%" height={12} />
      <Skeleton width="70%" height={36} />
      <Skeleton width="55%" height={14} />
      {height > 140 ? (
        <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
          <Skeleton width={56} height={36} />
          <Skeleton width={56} height={36} />
          <Skeleton width={56} height={36} />
        </View>
      ) : null}
    </View>
  );
}

const skelCard: ViewStyle = {
  flex: 1,
  backgroundColor: colors.surface,
  borderRadius: 18,
  borderWidth: 0.5,
  borderColor: colors.line,
  paddingVertical: 18,
  paddingHorizontal: 16,
  ...shadow.card,
};
