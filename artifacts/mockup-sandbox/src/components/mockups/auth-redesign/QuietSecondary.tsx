import React, { useState } from 'react';
import { SiStrava } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';

const FieldLabel = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => (
  <label htmlFor={htmlFor} className="text-sm font-medium leading-none text-[hsl(0,0%,20%)]">
    {children}
  </label>
);

export function QuietSecondary() {
  const [showPassword, setShowPassword] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

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
            {/* Recommended path: orange Strava */}
            <Button
              type="button"
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
                <span className="bg-white px-2 text-gray-500">or with email</span>
              </div>
            </div>

            <div className="space-y-3">
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

              {/* Quiet, dark secondary button — no longer competes with Strava */}
              <Button
                type="button"
                className="w-full bg-[hsl(0,0%,20%)] hover:bg-[hsl(0,0%,12%)] text-white"
              >
                Sign In
              </Button>
            </div>

            {/* ONE consolidated recovery disclosure */}
            <div className="border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setHelpOpen(!helpOpen)}
                className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-600 hover:text-[hsl(13,98%,49%)]"
              >
                Can't sign in?
                {helpOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {helpOpen && (
                <div className="mt-3 space-y-2 text-sm">
                  <button className="block w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 text-gray-700">
                    <span className="font-medium">Email me a one-tap sign-in link</span>
                    <span className="block text-xs text-gray-500">Works for any account</span>
                  </button>
                  <button className="block w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 text-gray-700">
                    <span className="font-medium">Reset my password</span>
                    <span className="block text-xs text-gray-500">If you set one up</span>
                  </button>
                </div>
              )}
            </div>

            <div className="text-center text-sm text-gray-600">
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
