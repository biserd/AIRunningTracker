import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Mail, CheckCircle, Loader2 } from "lucide-react";
import { Helmet } from "react-helmet";

export default function MaintenancePage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const joinWaitlistMutation = useMutation({
    mutationFn: async (email: string) => {
      return apiRequest("/api/waitlist", "POST", { email });
    },
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes("@")) {
      joinWaitlistMutation.mutate(email);
    }
  };

  return (
    <>
      <Helmet>
        <title>We'll Be Back Soon | RunAnalytics</title>
        <meta name="description" content="RunAnalytics is temporarily undergoing maintenance. Sign up to be notified when we're back online." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardContent className="pt-8 pb-8 px-6 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <Activity className="w-8 h-8 text-white" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">
              We'll Be Back Soon!
            </h1>
            
            <p className="text-slate-300 mb-6">
              We're performing some quick maintenance to make RunAnalytics even better. 
              We'll be back up and running shortly!
            </p>

            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-slate-400">
                  Get notified when we're back online:
                </p>
                
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                      required
                      data-testid="input-waitlist-email"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={joinWaitlistMutation.isPending}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    data-testid="button-notify-me"
                  >
                    {joinWaitlistMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Notify Me"
                    )}
                  </Button>
                </div>

                {joinWaitlistMutation.isError && (
                  <p className="text-sm text-red-400">
                    {(joinWaitlistMutation.error as any)?.message?.includes("duplicate") 
                      ? "You're already on the list!" 
                      : "Something went wrong. Please try again."}
                  </p>
                )}
              </form>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-green-400 font-medium">You're on the list!</p>
                <p className="text-sm text-slate-400">
                  We'll email you as soon as we're back online.
                </p>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-700">
              <p className="text-xs text-slate-500">
                Thank you for your patience. We're working hard to get back online!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
