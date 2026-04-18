import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { createElement } from "react";
import type { User } from "../types";

const TOKEN_KEY = "ra_jwt";

let cachedToken: string | null = null;

export async function getToken(): Promise<string | null> {
  if (cachedToken !== null) return cachedToken;
  try {
    const stored = await SecureStore.getItemAsync(TOKEN_KEY);
    cachedToken = stored;
    return stored;
  } catch {
    return null;
  }
}

export async function setToken(token: string | null): Promise<void> {
  cachedToken = token;
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  loadUser,
}: {
  children: ReactNode;
  loadUser: () => Promise<User | null>;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const loaded = await loadUser();
        if (!cancelled) setUser(loaded);
      } catch {
        await setToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadUser]);

  const signIn = async (token: string, nextUser: User) => {
    await setToken(token);
    setUser(nextUser);
  };

  const signOut = async () => {
    await setToken(null);
    setUser(null);
  };

  return createElement(
    AuthContext.Provider,
    { value: { user, loading, signIn, signOut, setUser } },
    children,
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
