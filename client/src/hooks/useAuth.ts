import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
    window.location.href = "/";
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !!token,
    logout,
    token,
  };
}