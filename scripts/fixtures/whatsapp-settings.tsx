import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WhatsAppConnectionCard } from "@/components/WhatsAppConnectionCard";
import "@/index.css";
createRoot(document.getElementById("root")!).render(<QueryClientProvider client={new QueryClient()}><main className="mx-auto max-w-3xl p-6"><WhatsAppConnectionCard userId={1007} hasAccess={!location.search.includes("free")} /></main></QueryClientProvider>);
