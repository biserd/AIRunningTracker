import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Activity, Eye, EyeOff, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { SiStrava } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { loginSchema, registerSchema, type LoginData, type RegisterData } from "@shared/schema";

type AuthMode = "signin" | "signup" | "magic";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [showPassword, setShowPassword] = useState(false);
  // When set, the entered email belongs to a Strava-only account — we
  // replace the password form with a clear "Sign in with Strava" CTA.
  const [stravaOnlyEmail, setStravaOnlyEmail] = useState<string | null>(null);
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

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", firstName: "", lastName: "" },
  });

  // Use raw fetch instead of apiRequest so we can read the structured
  // error body ({ message, code }) directly — apiRequest swallows it
  // into a single Error.message string.
  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err: Error & { code?: string } = new Error(body?.message || "Login failed");
        err.code = body?.code;
        throw err;
      }
      return body;
    },
    onSuccess: (response: any) => {
      localStorage.setItem("auth_token", response.token);
      toast({ title: "Welcome back!", description: "Successfully logged in" });
      const isPaid =
        response.user?.subscriptionPlan &&
        response.user.subscriptionPlan !== "free" &&
        (response.user.subscriptionStatus === "active" ||
          response.user.subscriptionStatus === "trialing");
      setLocation(isPaid ? "/dashboard" : "/audit-report");
    },
    onError: (error: Error & { code?: string }) => {
      // Strava-only account → swap the password form for a Strava CTA card.
      if (error.code === "STRAVA_ONLY") {
        setStravaOnlyEmail(loginForm.getValues("email"));
        return;
      }
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterData) => apiRequest("/api/auth/register", "POST", data),
    onSuccess: (response: any) => {
      localStorage.setItem("auth_token", response.token);
      toast({ title: "Welcome to RunAnalytics!", description: "Account created successfully" });
      setLocation("/audit-report");
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onLoginSubmit = (data: LoginData) => {
    setStravaOnlyEmail(null);
    loginMutation.mutate(data);
  };
  const onRegisterSubmit = (data: RegisterData) => registerMutation.mutate(data);

  const handleStravaLogin = () => {
    window.location.href = "/api/auth/strava-login";
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("magic-email") || "").trim();
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

  const switchToMagic = () => {
    setMode("magic");
    setStravaOnlyEmail(null);
    setMagicLinkSentTo(null);
  };

  const switchToSignin = () => {
    setMode("signin");
    setStravaOnlyEmail(null);
    setMagicLinkSentTo(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-strava-orange rounded-lg flex items-center justify-center">
                <Activity className="text-white" size={24} />
              </div>
              <h1 className="text-3xl font-bold text-charcoal">RunAnalytics</h1>
            </div>
          </Link>
          <p className="text-gray-600">
            {mode === "signin" && "Welcome back!"}
            {mode === "signup" && "Start your analytics journey"}
            {mode === "magic" && "We'll email you a one-tap link"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {mode === "signin" && "Sign In"}
              {mode === "signup" && "Create Account"}
              {mode === "magic" && "Email me a sign-in link"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Strava OAuth button — always visible at top of sign-in/up */}
            {mode !== "magic" && (
              <>
                <Button
                  type="button"
                  onClick={handleStravaLogin}
                  className="w-full bg-[#FC4C02] hover:bg-[#e04400] text-white font-semibold flex items-center justify-center gap-2 h-11"
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
              </>
            )}

            {/* Strava-only callout — shown after a failed password login on a
                Strava-created account. Replaces the password form so the user
                doesn't keep banging on a door that won't open. */}
            {stravaOnlyEmail && mode === "signin" && (
              <div
                className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-3"
                data-testid="strava-only-callout"
              >
                <div className="flex items-start gap-3">
                  <SiStrava className="h-5 w-5 text-[#FC4C02] mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-orange-900">
                      Looks like you signed up with Strava
                    </p>
                    <p className="text-xs text-orange-800">
                      <span className="font-medium">{stravaOnlyEmail}</span> doesn't have a password
                      — it's linked to your Strava account. Tap below to sign in.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleStravaLogin}
                  className="w-full bg-[#FC4C02] hover:bg-[#e04400] text-white font-semibold flex items-center justify-center gap-2"
                >
                  <SiStrava className="h-4 w-4" />
                  Sign in with Strava
                </Button>
                <button
                  type="button"
                  onClick={() => setStravaOnlyEmail(null)}
                  className="text-xs text-orange-700 hover:underline w-full text-center"
                >
                  Wrong account? Try a different email
                </button>
              </div>
            )}

            {mode === "signin" && !stravaOnlyEmail && (
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...loginForm.register("email")}
                    placeholder="your@email.com"
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-red-500">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      {...loginForm.register("password")}
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
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-red-500">{loginForm.formState.errors.password.message}</p>
                  )}
                  <div className="text-right">
                    <Link href="/forgot-password" className="text-sm text-strava-orange hover:underline" data-testid="link-forgot-password">
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-strava-orange hover:bg-strava-orange/90"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>

                <button
                  type="button"
                  onClick={switchToMagic}
                  className="w-full text-center text-sm text-gray-600 hover:text-strava-orange flex items-center justify-center gap-1.5 pt-1"
                  data-testid="link-magic-link"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email me a one-tap sign-in link instead
                </button>
              </form>
            )}

            {mode === "signup" && (
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
            )}

            {mode === "magic" && !magicLinkSentTo && (
              <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                <p className="text-sm text-gray-600">
                  Forgot how you signed up? Enter your email and we'll send you a one-tap
                  link that signs you in — works whether your account uses a password or
                  Strava.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="magic-email">Email</Label>
                  <Input
                    id="magic-email"
                    name="magic-email"
                    type="email"
                    placeholder="your@email.com"
                    required
                    data-testid="input-magic-email"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-strava-orange hover:bg-strava-orange/90"
                  disabled={magicLinkSubmitting}
                  data-testid="button-send-magic-link"
                >
                  {magicLinkSubmitting ? "Sending..." : "Email me a sign-in link"}
                </Button>
                <button
                  type="button"
                  onClick={switchToSignin}
                  className="w-full text-center text-sm text-gray-600 hover:text-strava-orange flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to sign in
                </button>
              </form>
            )}

            {mode === "magic" && magicLinkSentTo && (
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
                  onClick={switchToSignin}
                  className="w-full"
                >
                  Back to sign in
                </Button>
              </div>
            )}

            {mode !== "magic" && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    setStravaOnlyEmail(null);
                  }}
                  className="text-sm text-strava-orange hover:underline"
                >
                  {mode === "signin"
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in"}
                </button>
              </div>
            )}

            <div className="text-center">
              <Link href="/" className="inline-block">
                <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                  ← Back to Home
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
