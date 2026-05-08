import React, { useState } from 'react';
import { SiStrava } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Mail, Eye, EyeOff } from 'lucide-react';

const FieldLabel = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => (
  <label htmlFor={htmlFor} className="text-sm font-medium leading-none text-[hsl(0,0%,20%)]">
    {children}
  </label>
);

export function MagicLinkFirst() {
  const [usePassword, setUsePassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 inline-flex items-center justify-center gap-2 w-full">
          <div className="w-9 h-9 bg-[hsl(13,98%,49%)] rounded-lg flex items-center justify-center">
            <Activity className="text-white" size={20} />
          </div>
          <span className="text-2xl font-bold text-[hsl(0,0%,20%)]">RunAnalytics</span>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-semibold text-[hsl(0,0%,20%)]">Sign in</h2>
              <p className="text-sm text-gray-500">No password to remember</p>
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" type="email" placeholder="your@email.com" className="h-11" />
            </div>

            {!usePassword ? (
              <>
                <Button
                  type="button"
                  className="w-full bg-[hsl(13,98%,49%)] hover:bg-[hsl(13,98%,44%)] text-white font-semibold flex items-center justify-center gap-2 h-11"
                >
                  <Mail className="h-4 w-4" />
                  Email me a sign-in link
                </Button>
                <p className="text-xs text-center text-gray-500">
                  We'll send a one-tap link. Works whether you signed up with Strava or a password.
                </p>

                <button
                  type="button"
                  onClick={() => setUsePassword(true)}
                  className="w-full text-center text-sm text-gray-600 hover:text-[hsl(13,98%,49%)] underline-offset-2 hover:underline"
                >
                  Use password instead
                </button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <div className="relative">
                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="h-11" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="button" className="w-full bg-[hsl(0,0%,20%)] hover:bg-[hsl(0,0%,12%)] text-white h-11">
                  Sign In
                </Button>
                <button
                  type="button"
                  onClick={() => setUsePassword(false)}
                  className="w-full text-center text-sm text-gray-600 hover:text-[hsl(13,98%,49%)]"
                >
                  ← Back to one-tap link
                </button>
              </>
            )}

            <div className="relative pt-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">or</span>
              </div>
            </div>

            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-700 hover:text-[#FC4C02] py-2"
            >
              <SiStrava className="h-4 w-4 text-[#FC4C02]" />
              Continue with Strava
            </button>

            <div className="text-center text-sm text-gray-600 border-t border-gray-100 pt-3">
              New here?{' '}
              <button className="text-[hsl(13,98%,49%)] font-medium hover:underline">
                Create an account
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
