import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'wouter';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
        toast({
          title: "Check your email",
          description: "If an account exists with that email, a password reset link has been sent.",
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to send reset email",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Forgot Password - RunAnalytics</title>
        <meta name="description" content="Reset your RunAnalytics password. Enter your email to receive a password reset link." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Link href="/auth">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back-to-login">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </Link>

          <Card data-testid="card-forgot-password">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-strava-orange/10 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-strava-orange" />
              </div>
              <CardTitle className="text-2xl">Forgot Password?</CardTitle>
              <CardDescription>
                {isSubmitted 
                  ? "We've sent you an email with password reset instructions"
                  : "Enter your email address and we'll send you a link to reset your password"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isSubmitted ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      data-testid="input-email"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-strava-orange hover:bg-strava-orange/90"
                    disabled={isSubmitting}
                    data-testid="button-send-reset-link"
                  >
                    {isSubmitting ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center" data-testid="message-success">
                    <p className="text-green-800 dark:text-green-200">
                      Check your email for a password reset link. The link will expire in 1 hour.
                    </p>
                  </div>
                  
                  <div className="text-center text-sm text-muted-foreground">
                    Didn't receive the email? Check your spam folder or{' '}
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="text-strava-orange hover:underline"
                      data-testid="button-try-again"
                    >
                      try again
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Remember your password? </span>
                <Link href="/auth">
                  <a className="text-strava-orange hover:underline" data-testid="link-back-to-login">
                    Back to Login
                  </a>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
