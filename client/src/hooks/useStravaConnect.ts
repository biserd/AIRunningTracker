import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Runtime credentials belong on the server, not in the Vite build. This also
// starts an account-bound OAuth state instead of sending a plain user ID.
export function useStravaConnect(write = false) {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: async () => {
      const result = await apiRequest("/api/strava/authorize", "POST", { write });
      const url = new URL(result.url);
      if (url.protocol !== "https:" || url.hostname !== "www.strava.com" || url.pathname !== "/oauth/authorize" || !/^[1-9]\d*$/.test(url.searchParams.get("client_id") || "")) throw new Error("Invalid authorization response");
      return url.toString();
    },
    onSuccess: url => window.location.assign(url),
    onError: (error: Error) => toast({ title: "Could not open Strava", description: error.message.startsWith("401") ? "Please sign in again, then reconnect Strava." : "Strava connection is temporarily unavailable. Please try again later.", variant: "destructive" }),
  });
  return { connect: () => mutation.mutate(), isConnecting: mutation.isPending };
}
