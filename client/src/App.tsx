import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

// Code-split every route into its own chunk so visiting any single page
// no longer downloads/parses code for every other page. Huge LCP win on
// mobile (initial bundle drops from ~2.7MB monolith to a small shell + the
// per-route chunk).
const MaintenancePage = lazy(() => import("@/pages/maintenance"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const ActivityPage = lazy(() => import("@/pages/activity"));
const ActivitiesPage = lazy(() => import("@/pages/activities"));
const CoachInsightsPage = lazy(() => import("@/pages/coach-insights"));
const LandingPage = lazy(() => import("@/pages/landing"));
const AuthPage = lazy(() => import("@/pages/auth"));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const PrivacyPage = lazy(() => import("@/pages/privacy"));
const ContactPage = lazy(() => import("@/pages/contact"));
const FAQPage = lazy(() => import("@/pages/faq"));
const RunnerScorePage = lazy(() => import("@/pages/runner-score"));
const AdminPage = lazy(() => import("@/pages/admin"));
const AdminPerformanceLogsPage = lazy(() => import("@/pages/admin-performance-logs"));
const AdminShoesPage = lazy(() => import("@/pages/admin-shoes"));
const QueueDashboard = lazy(() => import("@/pages/admin/queue-dashboard"));
const AboutPage = lazy(() => import("@/pages/about"));
const TermsPage = lazy(() => import("@/pages/terms"));
const FeaturesPage = lazy(() => import("@/pages/features"));
const PricingPage = lazy(() => import("@/pages/pricing"));
const BillingPage = lazy(() => import("@/pages/billing"));
const ToolsPage = lazy(() => import("@/pages/tools"));
const AerobicDecouplingCalculator = lazy(() => import("@/pages/tools/aerobic-decoupling-calculator"));
const TrainingSplitAnalyzer = lazy(() => import("@/pages/tools/training-split-analyzer"));
const MarathonFuelingPlanner = lazy(() => import("@/pages/tools/marathon-fueling"));
const RacePredictor = lazy(() => import("@/pages/tools/race-predictor"));
const CadenceAnalyzer = lazy(() => import("@/pages/tools/cadence-analyzer"));
const RunningHeatmap = lazy(() => import("@/pages/tools/heatmap"));
const ShoeDatabase = lazy(() => import("@/pages/tools/shoes"));
const ShoeDetail = lazy(() => import("@/pages/tools/shoe-detail"));
const ShoeCompare = lazy(() => import("@/pages/tools/shoe-compare"));
const ShoeComparisonList = lazy(() => import("@/pages/tools/shoe-comparison-list"));
const ShoeComparisonDetail = lazy(() => import("@/pages/tools/shoe-comparison-detail"));
const ShoeFinder = lazy(() => import("@/pages/tools/shoe-finder"));
const RotationPlanner = lazy(() => import("@/pages/tools/rotation-planner"));
const ChatHistory = lazy(() => import("@/pages/chat-history"));
const BlogIndex = lazy(() => import("@/pages/blog/index"));
const AIRunningCoachGuide = lazy(() => import("@/pages/blog/ai-running-coach-complete-guide-2026"));
const BestStravaTools = lazy(() => import("@/pages/blog/best-strava-analytics-tools-2026"));
const ImproveRunningPace = lazy(() => import("@/pages/blog/how-to-improve-running-pace"));
const HowToPickTrainingPlan = lazy(() => import("@/pages/blog/how-to-pick-a-training-plan"));
const AICoachLanding = lazy(() => import("@/pages/ai-running-coach"));
const AIAgentCoachLanding = lazy(() => import("@/pages/ai-agent-coach"));
const AIAgentCoachBlogPost = lazy(() => import("@/pages/blog/ai-agent-coach-proactive-coaching"));
const UltraMarathonTrainingPlanBlogPost = lazy(() => import("@/pages/blog/ultra-marathon-training-plan-100-miler-guide"));
const DevelopersPage = lazy(() => import("@/pages/developers"));
const ApiDocsPage = lazy(() => import("@/pages/developers/api-docs"));
const YearRecapPage = lazy(() => import("@/pages/year-recap"));
const TrainingPlansPage = lazy(() => import("@/pages/training-plans"));
const TrainingPlanDetailPage = lazy(() => import("@/pages/training-plan-detail"));
const CoachOnboardingPage = lazy(() => import("@/pages/coach-onboarding"));
const CoachSettingsPage = lazy(() => import("@/pages/coach-settings"));
const AuditReportPage = lazy(() => import("@/pages/audit-report"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Pick up Strava OAuth JWT from short-lived cookie (_sta) set by the server callback.
// Runs synchronously at module load so useAuth sees the token on first render.
(function () {
  const match = document.cookie.match(/(?:^|;\s*)_sta=([^;]+)/);
  if (match) {
    localStorage.setItem("auth_token", decodeURIComponent(match[1]));
    document.cookie = "_sta=; Max-Age=0; path=/; SameSite=Lax";
  }
})();

// Minimal, neutral fallback shown while a route chunk is loading. Kept
// background-only (no spinner text) so it doesn't become the LCP element
// or cause layout shift.
function RouteFallback() {
  return <div className="min-h-screen bg-light-grey" aria-hidden="true" />;
}

function ProtectedRoute({ component: Component, requiresSubscription = false }: { component: React.ComponentType; requiresSubscription?: boolean }) {
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

function PremiumProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { hasActiveSubscription, isLoading: subLoading, isReverseTrial } = useSubscription();

  if (isLoading || subLoading) {
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

  // Allow access if user has active subscription OR is on reverse trial
  if (!hasActiveSubscription && !isReverseTrial) {
    window.location.href = "/audit-report";
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/features" component={FeaturesPage} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/faq" component={FAQPage} />
        <Route path="/runner-score/:userId" component={RunnerScorePage} />
        <Route path="/tools" component={ToolsPage} />
        <Route path="/tools/aerobic-decoupling-calculator" component={AerobicDecouplingCalculator} />
        <Route path="/tools/training-split-analyzer" component={TrainingSplitAnalyzer} />
        <Route path="/tools/marathon-fueling" component={MarathonFuelingPlanner} />
        <Route path="/tools/race-predictor" component={RacePredictor} />
        <Route path="/tools/cadence-analyzer" component={CadenceAnalyzer} />
        <Route path="/tools/shoes" component={ShoeDatabase} />
        <Route path="/tools/shoes/compare" component={ShoeComparisonList} />
        <Route path="/tools/shoes/compare/:slug" component={ShoeComparisonDetail} />
        <Route path="/tools/shoe-compare" component={ShoeCompare} />
        <Route path="/tools/shoes/:slug" component={ShoeDetail} />
        <Route path="/tools/shoe-finder" component={ShoeFinder} />
        <Route path="/tools/rotation-planner" component={RotationPlanner} />
        
        {/* Blog Routes */}
        <Route path="/blog" component={BlogIndex} />
        <Route path="/blog/ai-running-coach-complete-guide-2026" component={AIRunningCoachGuide} />
        <Route path="/blog/best-strava-analytics-tools-2026" component={BestStravaTools} />
        <Route path="/blog/how-to-improve-running-pace" component={ImproveRunningPace} />
        <Route path="/blog/how-to-pick-a-training-plan" component={HowToPickTrainingPlan} />
        <Route path="/blog/ai-agent-coach-proactive-coaching" component={AIAgentCoachBlogPost} />
        <Route path="/blog/ultra-marathon-training-plan-100-miler-guide" component={UltraMarathonTrainingPlanBlogPost} />
        <Route path="/ai-running-coach" component={AICoachLanding} />
        <Route path="/ai-agent-coach" component={AIAgentCoachLanding} />
        
        {/* Developer Routes */}
        <Route path="/developers" component={DevelopersPage} />
        <Route path="/developers/api" component={ApiDocsPage} />
        
        {/* Tool Routes */}
        <Route path="/tools/heatmap" component={RunningHeatmap} />
        
        {/* Protected Routes - Premium features require subscription */}
        <Route path="/chat-history">
          <PremiumProtectedRoute component={ChatHistory} />
        </Route>
        <Route path="/dashboard">
          <PremiumProtectedRoute component={Dashboard} />
        </Route>
        <Route path="/coach-insights">
          <PremiumProtectedRoute component={CoachInsightsPage} />
        </Route>
        {/* Redirects for old routes */}
        <Route path="/ml-insights">
          {() => { window.location.href = "/coach-insights"; return null; }}
        </Route>
        <Route path="/performance">
          {() => { window.location.href = "/coach-insights"; return null; }}
        </Route>
        <Route path="/settings">
          <ProtectedRoute component={SettingsPage} />
        </Route>
        <Route path="/billing">
          <ProtectedRoute component={BillingPage} />
        </Route>
        <Route path="/activities">
          <PremiumProtectedRoute component={ActivitiesPage} />
        </Route>
        <Route path="/activity/:id">
          <PremiumProtectedRoute component={ActivityPage} />
        </Route>
        <Route path="/admin">
          <ProtectedRoute component={AdminPage} />
        </Route>
        <Route path="/admin/performance-logs">
          <ProtectedRoute component={AdminPerformanceLogsPage} />
        </Route>
        <Route path="/admin/shoes">
          <ProtectedRoute component={AdminShoesPage} />
        </Route>
        <Route path="/admin/queue">
          <ProtectedRoute component={QueueDashboard} />
        </Route>
        <Route path="/year-recap">
          <PremiumProtectedRoute component={YearRecapPage} />
        </Route>
        <Route path="/training-plans">
          <PremiumProtectedRoute component={TrainingPlansPage} />
        </Route>
        <Route path="/training-plans/:planId">
          <PremiumProtectedRoute component={TrainingPlanDetailPage} />
        </Route>
        <Route path="/coach/onboarding">
          <PremiumProtectedRoute component={CoachOnboardingPage} />
        </Route>
        <Route path="/coach/settings">
          <PremiumProtectedRoute component={CoachSettingsPage} />
        </Route>
        <Route path="/audit-report">
          <ProtectedRoute component={AuditReportPage} />
        </Route>
        
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  // Check for maintenance mode via environment variable
  const isMaintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === 'true';

  if (isMaintenanceMode) {
    return (
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<RouteFallback />}>
          <MaintenancePage />
        </Suspense>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <PWAInstallPrompt />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
