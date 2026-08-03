import { Activity, User, LogOut, Settings, Brain, Home, Shield, MessageCircle, CalendarCheck, List } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Badge } from "@/components/ui/badge";
import FeedbackDialog from "@/components/FeedbackDialog";

const navigationItems = [
  { path: "/dashboard", label: "Dashboard", mobileLabel: "Home", icon: Home },
  { path: "/activities", label: "Activities", mobileLabel: "Runs", icon: List },
  { path: "/coach-insights", label: "Coach Insights", mobileLabel: "Coach", icon: Brain },
  { path: "/training-plans", label: "Training Plans", mobileLabel: "Plans", icon: CalendarCheck },
];

export default function AppHeader() {
  const { user, logout } = useAuth();
  const { isPro, hasActiveSubscription } = useSubscription();
  const [location] = useLocation();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 md:py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 md:w-10 md:h-10 bg-strava-orange rounded-lg flex items-center justify-center">
                  <Activity className="text-white" size={20} />
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-charcoal">RunAnalytics</h1>
              </div>
            </Link>
          </div>

          {/* Navigation Menu */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Button
                    key={item.path}
                    asChild
                    variant={isActive ? "default" : "ghost"}
                    className={`flex items-center space-x-2 ${
                      isActive 
                        ? "bg-strava-orange text-white hover:bg-strava-orange/90" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                  <Link href={item.path}>
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                </Button>
              );
            })}
            
            {/* Admin Link - only show for admin users */}
            {user?.isAdmin && (
              <Button
                  asChild
                  variant={location === "/admin" ? "default" : "ghost"}
                  className={`flex items-center space-x-2 ${
                    location === "/admin"
                      ? "bg-strava-orange text-white hover:bg-strava-orange/90" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                <Link href="/admin">
                  <Shield size={16} />
                  <span>Admin</span>
                </Link>
              </Button>
            )}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-strava-orange text-white text-sm">
                      {user?.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-sm text-gray-700">{user?.email}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center space-x-2 cursor-pointer">
                    <Settings size={16} />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/chat-history" className="flex items-center space-x-2 cursor-pointer">
                    <MessageCircle size={16} />
                    <span>Chat History</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setFeedbackOpen(true)}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <MessageCircle size={16} />
                  <span>Send Feedback</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="flex items-center space-x-2 cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav
          className="md:hidden mt-3 grid gap-1"
          style={{ gridTemplateColumns: `repeat(${user?.isAdmin ? 5 : 4}, minmax(0, 1fr))` }}
        >
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Button
                  key={item.path}
                  asChild
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={`h-auto w-full flex-col gap-1 px-1 py-2 ${
                    isActive 
                      ? "bg-strava-orange text-white" 
                      : "text-gray-600"
                  }`}
                >
                <Link href={item.path}>
                  <Icon size={16} />
                  <span className="text-[10px] leading-none">{item.mobileLabel}</span>
                </Link>
              </Button>
            );
          })}
          
          {/* Admin Link - only show for admin users */}
          {user?.isAdmin && (
            <Button
                asChild
                variant={location === "/admin" ? "default" : "ghost"}
                size="sm"
                className={`h-auto w-full flex-col gap-1 px-1 py-2 ${
                  location === "/admin"
                    ? "bg-strava-orange text-white" 
                    : "text-gray-600"
                }`}
                data-testid="mobile-nav-admin"
              >
              <Link href="/admin">
                <Shield size={16} />
                <span className="text-[10px] leading-none">Admin</span>
              </Link>
            </Button>
          )}
        </nav>
      </div>

      {/* Feedback Dialog */}
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </header>
  );
}
