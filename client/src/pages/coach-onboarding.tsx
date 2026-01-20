import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import CoachOnboardingWizard from "@/components/CoachOnboardingWizard";
import { Loader2 } from "lucide-react";

export default function CoachOnboardingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { isPremium, isLoading: subLoading } = useSubscription();
  const [, setLocation] = useLocation();

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-strava-orange mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    setLocation("/auth");
    return null;
  }

  if (!isPremium) {
    setLocation("/pricing");
    return null;
  }

  return (
    <CoachOnboardingWizard 
      onComplete={() => setLocation("/coach-insights")} 
    />
  );
}
