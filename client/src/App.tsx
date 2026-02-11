import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import MaintenancePage from "@/pages/maintenance";
import Dashboard from "@/pages/dashboard";
import SettingsPage from "@/pages/settings";
import ActivityPage from "@/pages/activity";
import ActivitiesPage from "@/pages/activities";
import CoachInsightsPage from "@/pages/coach-insights";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import PrivacyPage from "@/pages/privacy";
import ContactPage from "@/pages/contact";
import FAQPage from "@/pages/faq";
import RunnerScorePage from "@/pages/runner-score";
import AdminPage from "@/pages/admin";
import AdminPerformanceLogsPage from "@/pages/admin-performance-logs";
import AdminShoesPage from "@/pages/admin-shoes";
import QueueDashboard from "@/pages/admin/queue-dashboard";
import AboutPage from "@/pages/about";
import TermsPage from "@/pages/terms";
import FeaturesPage from "@/pages/features";
import PricingPage from "@/pages/pricing";
import BillingPage from "@/pages/billing";
import ToolsPage from "@/pages/tools";
import AerobicDecouplingCalculator from "@/pages/tools/aerobic-decoupling-calculator";
import TrainingSplitAnalyzer from "@/pages/tools/training-split-analyzer";
import MarathonFuelingPlanner from "@/pages/tools/marathon-fueling";
import RacePredictor from "@/pages/tools/race-predictor";
import CadenceAnalyzer from "@/pages/tools/cadence-analyzer";
import RunningHeatmap from "@/pages/tools/heatmap";
import ShoeDatabase from "@/pages/tools/shoes";
import ShoeDetail from "@/pages/tools/shoe-detail";
import ShoeCompare from "@/pages/tools/shoe-compare";
import ShoeComparisonList from "@/pages/tools/shoe-comparison-list";
import ShoeComparisonDetail from "@/pages/tools/shoe-comparison-detail";
import ShoeFinder from "@/pages/tools/shoe-finder";
import RotationPlanner from "@/pages/tools/rotation-planner";
import ChatHistory from "@/pages/chat-history";
import BlogIndex from "@/pages/blog/index";
import AIRunningCoachGuide from "@/pages/blog/ai-running-coach-complete-guide-2026";
import BestStravaTools from "@/pages/blog/best-strava-analytics-tools-2026";
import ImproveRunningPace from "@/pages/blog/how-to-improve-running-pace";
import HowToPickTrainingPlan from "@/pages/blog/how-to-pick-a-training-plan";
import AICoachLanding from "@/pages/ai-running-coach";
import AIAgentCoachLanding from "@/pages/ai-agent-coach";
import AIAgentCoachBlogPost from "@/pages/blog/ai-agent-coach-proactive-coaching";
import UltraMarathonTrainingPlanBlogPost from "@/pages/blog/ultra-marathon-training-plan-100-miler-guide";
import DevelopersPage from "@/pages/developers";
import ApiDocsPage from "@/pages/developers/api-docs";
import YearRecapPage from "@/pages/year-recap";
import TrainingPlansPage from "@/pages/training-plans";
import TrainingPlanDetailPage from "@/pages/training-plan-detail";
import CoachOnboardingPage from "@/pages/coach-onboarding";
import CoachSettingsPage from "@/pages/coach-settings";
import AuditReportPage from "@/pages/audit-report";
import NotFound from "@/pages/not-found";

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
  );
}

function App() {
  // Check for maintenance mode via environment variable
  const isMaintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === 'true';

  if (isMaintenanceMode) {
    return (
      <QueryClientProvider client={queryClient}>
        <MaintenancePage />
      </QueryClientProvider>
    );
  }

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
