import React, { useState } from 'react';
import { SiStrava } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Eye, EyeOff } from 'lucide-react';

const FieldLabel = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => (
  <label htmlFor={htmlFor} className="text-sm font-medium leading-none text-[hsl(0,0%,20%)]">
    {children}
  </label>
);

export function StravaFirst() {
  const [showEmail, setShowEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center gap-2 mb-2">
            <div className="w-9 h-9 bg-[hsl(13,98%,49%)] rounded-lg flex items-center justify-center">
              <Activity className="text-white" size={20} />
            </div>
            <span className="text-2xl font-bold text-[hsl(0,0%,20%)]">RunAnalytics</span>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-semibold text-[hsl(0,0%,20%)]">Welcome back</h2>
              <p className="text-sm text-gray-500">Sign in to continue your training</p>
            </div>

            <Button
              type="button"
              className="w-full bg-[#FC4C02] hover:bg-[#e04400] text-white font-semibold flex items-center justify-center gap-2 h-12 text-base"
            >
              <SiStrava className="h-5 w-5" />
              Continue with Strava
            </Button>

            <p className="text-xs text-center text-gray-500">
              Most runners sign in this way
            </p>

            {!showEmail ? (
              <button
                type="button"
                onClick={() => setShowEmail(true)}
                className="w-full text-center text-sm text-gray-600 hover:text-[hsl(13,98%,49%)] underline-offset-2 hover:underline pt-2"
              >
                Sign in with email instead
              </button>
            ) : (
              <div className="pt-2 space-y-3 border-t border-gray-100">
                <div className="space-y-2">
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input id="email" type="email" placeholder="your@email.com" />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <div className="relative">
                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="button" variant="outline" className="w-full">
                  Sign In
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-xs text-gray-500 hover:text-[hsl(13,98%,49%)]"
                >
                  Trouble signing in?
                </button>
              </div>
            )}

            <div className="text-center pt-2 border-t border-gray-100">
              <button className="text-sm text-gray-600 hover:text-[hsl(13,98%,49%)]">
                New here? <span className="text-[hsl(13,98%,49%)] font-medium">Create an account</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
