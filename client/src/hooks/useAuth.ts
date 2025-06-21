import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useAuth() {
  const token = localStorage.getItem("auth_token");
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: () => apiRequest("/api/auth/user", "GET"),
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const logout = () => {
    localStorage.removeItem("auth_token");
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