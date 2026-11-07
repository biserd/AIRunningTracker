import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useStravaConnect } from "@/hooks/useStravaConnect";
import { StravaConnectButton } from "@/components/StravaConnect";
import { Toaster } from "@/components/ui/toaster";

function Fixture() {
  const { connect, isConnecting } = useStravaConnect(new URLSearchParams(location.search).get("write") === "1");
  return <><StravaConnectButton onClick={connect} loading={isConnecting} /><Toaster /></>;
}
createRoot(document.getElementById("root")!).render(<QueryClientProvider client={new QueryClient()}><Fixture /></QueryClientProvider>);
