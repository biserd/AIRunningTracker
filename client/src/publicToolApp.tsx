import React, { type ComponentType } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { Router, Route, Switch } from "wouter";
import { useBrowserLocation } from "wouter/use-browser-location";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ExternalLinkPolicy } from "@/components/ExternalLinkPolicy";

type ToolModule = { default: ComponentType };

const exactToolRoutes: Record<string, () => Promise<ToolModule>> = {
  "/tools": () => import("@/pages/tools"),
  "/tools/aerobic-decoupling-calculator": () => import("@/pages/tools/aerobic-decoupling-calculator"),
  "/tools/training-split-analyzer": () => import("@/pages/tools/training-split-analyzer"),
  "/tools/marathon-fueling": () => import("@/pages/tools/marathon-fueling"),
  "/tools/race-predictor": () => import("@/pages/tools/race-predictor"),
  "/tools/cadence-analyzer": () => import("@/pages/tools/cadence-analyzer"),
  "/tools/training-pace-calculator": () => import("@/pages/tools/training-pace-calculator"),
  "/tools/race-split-calculator": () => import("@/pages/tools/race-split-calculator"),
  "/tools/heatmap": () => import("@/pages/tools/heatmap"),
  "/tools/shoes": () => import("@/pages/tools/shoes"),
  "/tools/shoes/compare": () => import("@/pages/tools/shoe-comparison-list"),
  "/tools/shoe-compare": () => import("@/pages/tools/shoe-compare"),
  "/tools/shoe-finder": () => import("@/pages/tools/shoe-finder"),
  "/tools/rotation-planner": () => import("@/pages/tools/rotation-planner"),
};

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

export async function loadPublicToolComponent(pathname: string): Promise<ComponentType | null> {
  const normalizedPath = normalizePathname(pathname);
  const exactLoader = exactToolRoutes[normalizedPath];
  if (exactLoader) return (await exactLoader()).default;

  if (/^\/tools\/shoes\/compare\/[^/]+$/.test(normalizedPath)) {
    return (await import("@/pages/tools/shoe-comparison-detail")).default;
  }
  if (/^\/tools\/shoes\/[^/]+$/.test(normalizedPath)) {
    return (await import("@/pages/tools/shoe-detail")).default;
  }

  return null;
}

export function isPublicToolPath(pathname: string): boolean {
  const normalizedPath = normalizePathname(pathname);
  return Boolean(exactToolRoutes[normalizedPath])
    || /^\/tools\/shoes\/compare\/[^/]+$/.test(normalizedPath)
    || /^\/tools\/shoes\/[^/]+$/.test(normalizedPath);
}

interface PublicToolAppProps {
  Component: ComponentType;
  queryClient: QueryClient;
  ssrPath?: string;
}

// This lightweight entry loads one tool, not the entire SPA. A new route must
// load its own document/component instead of retaining the previous tool.
const useToolLocation: typeof useBrowserLocation = (options) => {
  const [location] = useBrowserLocation(options);
  return [location, (to, navigation) => {
    if (navigation?.replace) window.location.replace(to);
    else window.location.assign(to);
  }];
};

export function PublicToolApp({ Component, queryClient, ssrPath }: PublicToolAppProps) {
  return (
    <Router ssrPath={ssrPath} hook={useToolLocation}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ExternalLinkPolicy />
          <Toaster />
          <Switch>
            <Route path="/tools/shoes/compare/:slug" component={Component} />
            <Route path="/tools/shoes/:slug" component={Component} />
            <Route component={Component} />
          </Switch>
        </TooltipProvider>
      </QueryClientProvider>
    </Router>
  );
}
