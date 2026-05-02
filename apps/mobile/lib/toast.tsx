import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { shadow } from "./theme";

type ToastTone = "info" | "success" | "error";
type Toast = { id: number; message: string; tone: ToastTone };

const ToastContext = createContext<{
  show: (message: string, tone?: ToastTone) => void;
}>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -12, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => {
      // If a new toast was shown mid-dismiss, the animation was interrupted
      // (finished=false). Don't clear state in that case — the new toast owns it.
      if (finished) setToast(null);
    });
  }, [opacity, translateY]);

  const show = useCallback(
    (message: string, tone: ToastTone = "info") => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ id: nextId++, message, tone });
      opacity.setValue(0);
      translateY.setValue(-12);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
      timer.current = setTimeout(dismiss, 3500);
    },
    [opacity, translateY, dismiss],
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const palette =
    toast?.tone === "error"
      ? { bg: "#3B1A18", fg: "#FFD9D6", icon: "alert-circle" as const }
      : toast?.tone === "success"
        ? { bg: "#1E3B1A", fg: "#D7F2D2", icon: "checkmark-circle" as const }
        : { bg: "#1A1815", fg: "#F2EFE8", icon: "information-circle" as const };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[styles.wrap, { opacity, transform: [{ translateY }] }]}
        >
          <Pressable
            onPress={dismiss}
            style={[styles.toast, { backgroundColor: palette.bg }]}
          >
            <Ionicons name={palette.icon} size={18} color={palette.fg} />
            <Text
              numberOfLines={3}
              style={{
                flex: 1,
                color: palette.fg,
                fontSize: 13.5,
                fontWeight: "500",
                lineHeight: 19,
              }}
            >
              {toast.message}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 56,
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    width: "100%",
    ...shadow.raised,
  },
});
