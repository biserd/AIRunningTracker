import { Activity } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function PublicHeader() {
  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-strava-orange rounded-lg flex items-center justify-center">
                <Activity className="text-white" size={20} />
              </div>
              <h1 className="text-2xl font-bold text-charcoal">RunAnalytics</h1>
            </div>
          </Link>
          <Link href="/auth">
            <Button variant="outline" data-testid="header-sign-in">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
