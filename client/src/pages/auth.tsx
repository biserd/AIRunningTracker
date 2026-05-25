import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Activity, Eye, EyeOff, Mail, CheckCircle2 } from "lucide-react";
import { SiStrava } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { notifyExtensionAuth } from "@/lib/extensionBridge";
import { useToast } from "@/hooks/use-toast";
import { registerSchema, type RegisterData } from "@shared/schema";

type AuthMode = "signin" | "signup";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [magicLinkSentTo, setMagicLinkSentTo] = useState<string | null>(null);
  const [magicLinkSubmitting, setMagicLinkSubmitting] = useState(false);
  const { toast } = useToast();

  // Handle Strava OAuth error redirects — e.g., user denied Strava access
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stravaError = params.get("error");

    if (stravaError) {
      const message =
        stravaError === "strava_denied"
          ? "Strava connection was cancelled."
          : "Strava sign-in failed. Please try again.";
      toast({ title: "Sign-in failed", description: message, variant: "destructive" });
      window.history.replaceState({}, "", "/auth");
    }
  }, []);

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", firstName: "", lastName: "" },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterData) => apiRequest("/api/auth/register", "POST", data),
    onSuccess: (response: any) => {
      localStorage.setItem("auth_token", response.token);
      notifyExtensionAuth(response.token, response.user || {});
      toast({ title: "Welcome to RunAnalytics!", description: "Account created successfully" });
      setLocation("/dashboard?welcome=1");
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onRegisterSubmit = (data: RegisterData) => registerMutation.mutate(data);

  const handleStravaLogin = () => {
    window.location.href = "/api/auth/strava-login";
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = magicLinkEmail.trim();
    if (!email) {
      toast({ title: "Email required", description: "Enter your email address", variant: "destructive" });
      return;
    }
    setMagicLinkSubmitting(true);
    try {
      const res = await fetch("/api/auth/magic-link/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Couldn't send sign-in link");
      }
      setMagicLinkSentTo(email);
    } catch (err: any) {
      toast({
        title: "Couldn't send link",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setMagicLinkSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header — single line, no redundant subtitle */}
        <div className="text-center mb-6">
          <Link href="/">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-10 h-10 bg-strava-orange rounded-lg flex items-center justify-center">
                <Activity className="text-white" size={24} />
              </div>
              <h1 className="text-3xl font-bold text-charcoal">RunAnalytics</h1>
            </div>
          </Link>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-center text-xl">
              {mode === "signin" ? "Sign in" : "Create your account"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* SIGN IN — two paths only: Strava OAuth or magic-link email */}
            {mode === "signin" && !magicLinkSentTo && (
              <>
                <Button
                  type="button"
                  onClick={handleStravaLogin}
                  className="w-full bg-[#FC4C02] hover:bg-[#e04400] text-white font-semibold flex items-center justify-center gap-2 h-11"
                  data-testid="button-strava-login"
                >
                  <SiStrava className="h-5 w-5" />
                  Continue with Strava
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">or</span>
                  </div>
                </div>

                <form onSubmit={handleMagicLinkSubmit} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="magic-email">Email</Label>
                    <Input
                      id="magic-email"
                      name="magic-email"
                      type="email"
                      placeholder="your@email.com"
                      value={magicLinkEmail}
                      onChange={(e) => setMagicLinkEmail(e.target.value)}
                      required
                      autoComplete="email"
                      data-testid="input-magic-email"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-charcoal hover:bg-charcoal/90 text-white flex items-center justify-center gap-2"
                    disabled={magicLinkSubmitting}
                    data-testid="button-send-magic-link"
                  >
                    <Mail className="h-4 w-4" />
                    {magicLinkSubmitting ? "Sending…" : "Email me a sign-in link"}
                  </Button>
                  <p className="text-xs text-center text-gray-500">
                    We'll send a one-tap link. No password needed.
                  </p>
                </form>
              </>
            )}

            {/* Magic-link sent confirmation — replaces the form once submitted */}
            {mode === "signin" && magicLinkSentTo && (
              <div className="space-y-4 text-center" data-testid="magic-link-sent">
                <div className="mx-auto w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-green-600" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-charcoal">Check your inbox</p>
                  <p className="text-sm text-gray-600">
                    If an account exists for <span className="font-medium">{magicLinkSentTo}</span>,
                    we've sent a one-tap sign-in link. It expires in 15 minutes.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMagicLinkSentTo(null);
                    setMagicLinkEmail("");
                  }}
                  className="w-full"
                >
                  Use a different email
                </Button>
              </div>
            )}

            {/* SIGN UP — keep the existing email/password registration form.
                Passwordless signup is a future backend change. */}
            {mode === "signup" && (
              <>
                <Button
                  type="button"
                  onClick={handleStravaLogin}
                  className="w-full bg-[#FC4C02] hover:bg-[#e04400] text-white font-semibold flex items-center justify-center gap-2 h-11"
                >
                  <SiStrava className="h-5 w-5" />
                  Sign up with Strava
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">or</span>
                  </div>
                </div>

                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        {...registerForm.register("firstName")}
                        placeholder="John"
                      />
                      {registerForm.formState.errors.firstName && (
                        <p className="text-sm text-red-500">{registerForm.formState.errors.firstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        {...registerForm.register("lastName")}
                        placeholder="Doe"
                      />
                      {registerForm.formState.errors.lastName && (
                        <p className="text-sm text-red-500">{registerForm.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      {...registerForm.register("email")}
                      placeholder="your@email.com"
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-red-500">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        {...registerForm.register("password")}
                        placeholder="••••••••"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-red-500">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-strava-orange hover:bg-strava-orange/90"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </>
            )}

            {/* Mode toggle */}
            <div className="text-center border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setMagicLinkSentTo(null);
                  setMagicLinkEmail("");
                }}
                className="text-sm text-gray-600 hover:text-strava-orange"
              >
                {mode === "signin" ? (
                  <>New here? <span className="text-strava-orange font-medium">Create an account</span></>
                ) : (
                  <>Already have an account? <span className="text-strava-orange font-medium">Sign in</span></>
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
