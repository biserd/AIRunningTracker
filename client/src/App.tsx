import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import SettingsPage from "@/pages/settings";
import ActivityPage from "@/pages/activity";
import MLInsightsPage from "@/pages/ml-insights";
import PerformancePage from "@/pages/performance";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/ml-insights" component={MLInsightsPage} />
      <Route path="/performance" component={PerformancePage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/activity/:id" component={ActivityPage} />
      <Route component={() => <div>Page not found</div>} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
