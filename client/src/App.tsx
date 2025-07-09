import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import SettingsPage from "@/pages/settings";
import ActivityPage from "@/pages/activity";
import MLInsightsPage from "@/pages/ml-insights";
import PerformancePage from "@/pages/performance";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import PrivacyPage from "@/pages/privacy";
import ContactPage from "@/pages/contact";
import RunnerScorePage from "@/pages/runner-score";
import AdminPage from "@/pages/admin";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-strava-orange mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/auth";
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/runner-score/:userId" component={RunnerScorePage} />
      
      {/* Protected Routes */}
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/ml-insights">
        <ProtectedRoute component={MLInsightsPage} />
      </Route>
      <Route path="/performance">
        <ProtectedRoute component={PerformancePage} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={SettingsPage} />
      </Route>
      <Route path="/activity/:id">
        <ProtectedRoute component={ActivityPage} />
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={AdminPage} />
      </Route>
      
      <Route component={NotFound} />
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
