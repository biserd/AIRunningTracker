import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Activity, RefreshCw, Brain, User, Settings, LogOut } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { StravaConnectButton } from "@/components/StravaConnect";

interface HeaderProps {
  stravaConnected: boolean;
  onStravaConnect: () => void;
  onSyncActivities: () => void;
  isSyncing: boolean;
  lastSyncAt?: string;
}

export default function Header({ 
  stravaConnected, 
  onStravaConnect, 
  onSyncActivities,
  isSyncing,
  lastSyncAt 
}: HeaderProps) {
  const { user, logout } = useAuth();

  const formatSyncTime = (dateString?: string) => {
    if (!dateString) return "Never";
    
    const now = new Date();
    const syncDate = new Date(dateString);
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return syncDate.toLocaleDateString();
  };
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-strava-orange rounded-lg flex items-center justify-center">
              <Activity className="text-white" size={20} />
            </div>
            <h1 className="text-2xl font-bold text-charcoal">RunAnalytics</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {stravaConnected ? (
              <>
                <Badge variant="secondary" className="bg-achievement-green/10 text-achievement-green border-achievement-green/20">
                  <div className="w-2 h-2 bg-achievement-green rounded-full mr-2"></div>
                  Strava Connected
                </Badge>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onSyncActivities}
                      disabled={isSyncing}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Syncing...' : 'Sync'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sync latest activities from Strava</p>
                  </TooltipContent>
                </Tooltip>



                <Link href="/ml-insights">
                  <Button variant="outline" size="sm" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                    <Brain className="h-4 w-4 mr-2" />
                    ML Insights
                  </Button>
                </Link>

                <Link href="/performance">
                  <Button variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-50">
                    <Activity className="h-4 w-4 mr-2" />
                    Performance
                  </Button>
                </Link>
              </>
            ) : (
              <StravaConnectButton 
                onClick={onStravaConnect}
                variant="orange"
                size="sm"
              />
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="text-sm font-medium hidden sm:block">
                    {user?.firstName || user?.email?.split('@')[0] || 'User'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={logout}
                  className="flex items-center text-red-600 focus:text-red-600"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
