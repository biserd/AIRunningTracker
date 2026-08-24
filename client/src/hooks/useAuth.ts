import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { notifyExtensionLogout } from "@/lib/extensionBridge";

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    // Match the anonymous server render for the first hydration pass. Read the
    // browser-only token immediately afterward so signed-in users retain the
    // same behavior without forcing React to discard the fast server markup.
    if (document.getElementById("root")?.dataset.ssrTool === "true") return null;
    return localStorage.getItem("auth_token");
  });

  useEffect(() => {
    setToken(localStorage.getItem("auth_token"));
  }, []);
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: () => apiRequest("/api/auth/user", "GET"),
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const logout = () => {
    localStorage.removeItem("auth_token");
    notifyExtensionLogout();
    // Clear all cached data
    queryClient.clear();
    window.location.href = "/";
  };

  // If no token, user is definitely not authenticated
  if (!token) {
    return {
      user: null,
      isLoading: false,
      isAuthenticated: false,
      logout,
      token: null,
    };
  }

  // If there's an error (like 401), user is not authenticated
  if (error) {
    return {
      user: null,
      isLoading: false,
      isAuthenticated: false,
      logout,
      token,
    };
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !!token,
    logout,
    token,
  };
}
