import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Mail, CheckCircle, Brain, BarChart, Target, Shield, Zap, TrendingUp } from "lucide-react";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type EmailData = z.infer<typeof emailSchema>;

export default function LandingPage() {
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<EmailData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  const emailMutation = useMutation({
    mutationFn: (data: EmailData) => apiRequest("/api/waitlist", "POST", data),
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Welcome to the waitlist!",
        description: "We'll notify you when RunAnalytics launches",
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Something went wrong",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmailData) => {
    emailMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-strava-orange rounded-lg flex items-center justify-center">
                <Activity className="text-white" size={20} />
              </div>
              <h1 className="text-2xl font-bold text-charcoal">RunAnalytics</h1>
            </div>
            <Link href="/auth">
              <Button variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-6 bg-blue-100 text-blue-800 border-blue-200">
            Coming Soon
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold text-charcoal mb-6">
            AI-Powered Running
            <span className="text-strava-orange"> Analytics</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Transform your running performance with advanced AI insights, personalized training plans, 
            and comprehensive performance analytics powered by your Strava data.
          </p>

          {/* Email Signup */}
          <Card className="max-w-md mx-auto mb-12">
            <CardContent className="p-6">
              {submitted ? (
                <div className="text-center space-y-4">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                  <h3 className="text-lg font-semibold text-charcoal">You're on the list!</h3>
                  <p className="text-gray-600">We'll notify you when RunAnalytics launches.</p>
                </div>
              ) : (
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <h3 className="text-lg font-semibold text-charcoal">Join the waitlist</h3>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      {...form.register("email")}
                      className="pl-10"
                      placeholder="Enter your email"
                      disabled={emailMutation.isPending}
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-600 text-left">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-strava-orange hover:bg-strava-orange/90"
                    disabled={emailMutation.isPending}
                  >
                    {emailMutation.isPending ? "Adding..." : "Get Early Access"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/auth">
              <Button variant="link" className="p-0 h-auto text-strava-orange">
                Sign in here
              </Button>
            </Link>
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-charcoal mb-4">
              Revolutionary Running Insights
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Unlock your potential with cutting-edge AI analysis that understands your unique running patterns and goals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto">
                <Brain className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal">AI Performance Analysis</h3>
              <p className="text-gray-600">
                Advanced machine learning algorithms analyze your training patterns to provide personalized insights and recommendations.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto">
                <Target className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal">Race Predictions</h3>
              <p className="text-gray-600">
                Accurate race time predictions for 5K to marathon distances based on your current fitness and training data.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto">
                <BarChart className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal">Performance Metrics</h3>
              <p className="text-gray-600">
                VO2 Max estimation, running efficiency analysis, and heart rate zone optimization for maximum performance.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center mx-auto">
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal">Smart Training Plans</h3>
              <p className="text-gray-600">
                Personalized training schedules that adapt to your progress and optimize for your specific goals.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal">Injury Prevention</h3>
              <p className="text-gray-600">
                Proactive risk analysis identifies potential injury patterns and provides prevention strategies.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto">
                <Zap className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-charcoal">Efficiency Optimization</h3>
              <p className="text-gray-600">
                Biomechanical analysis of your running form with actionable recommendations for improved efficiency.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-50 to-orange-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4 text-charcoal">
            Ready to Transform Your Running?
          </h2>
          <p className="text-xl mb-8 text-gray-700">
            Join thousands of runners who are already improving their performance with AI-powered insights.
          </p>
          <Link href="/auth">
            <Button
              size="lg"
              className="bg-strava-orange text-white hover:bg-strava-orange/90"
            >
              Get Started Today
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-charcoal text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-strava-orange rounded-lg flex items-center justify-center">
                  <Activity className="text-white" size={16} />
                </div>
                <h3 className="text-xl font-bold">RunAnalytics</h3>
              </div>
              <p className="text-gray-400 mb-4">
                AI-powered running analytics platform that helps athletes optimize their performance and achieve their goals.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/ml-insights" className="hover:text-white transition-colors">AI Insights</Link></li>
                <li><Link href="/performance" className="hover:text-white transition-colors">Training Plans</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/dashboard" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 RunAnalytics. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}