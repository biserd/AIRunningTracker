import { useEffect } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function SubscribePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        setLocation('/dashboard');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user, setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
      <Card className="w-full max-w-2xl mx-6">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-strava-orange/10 p-4 rounded-full">
              <Crown className="h-12 w-12 text-strava-orange" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-charcoal mb-4">
            All Features Are Free!
          </h1>
          
          <p className="text-lg text-gray-600 mb-6">
            Good news! All RunAnalytics Pro features are now available to every user at no cost.
          </p>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <p className="text-green-800 font-medium">
              {user ? "You already have" : "Sign up to get"} full access to:
            </p>
            <ul className="mt-4 space-y-2 text-left text-sm text-green-700">
              <li>✓ Advanced AI insights & recommendations</li>
              <li>✓ Personalized training plans</li>
              <li>✓ Race time predictions</li>
              <li>✓ Injury risk analysis</li>
              <li>✓ Unlimited data history</li>
              <li>✓ All tools and calculators</li>
            </ul>
          </div>

          {user ? (
            <>
              <p className="text-gray-500 text-sm mb-6">
                Redirecting you to your dashboard in 3 seconds...
              </p>
              
              <div className="flex gap-3 justify-center">
                <Link href="/dashboard">
                  <Button className="bg-strava-orange hover:bg-strava-orange/90" data-testid="button-dashboard">
                    Go to Dashboard
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" data-testid="button-home">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Home
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="flex gap-3 justify-center">
              <Link href="/auth">
                <Button className="bg-strava-orange hover:bg-strava-orange/90" data-testid="button-signup">
                  Sign Up Free
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" data-testid="button-home">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}