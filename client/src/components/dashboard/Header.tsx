import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, RefreshCw, Brain, User, Settings } from "lucide-react";
import { Link } from "wouter";

interface HeaderProps {
  stravaConnected: boolean;
  onStravaConnect: () => void;
  onSyncActivities: () => void;
  onGenerateInsights: () => void;
  isSyncing: boolean;
  isGeneratingInsights: boolean;
}

export default function Header({ 
  stravaConnected, 
  onStravaConnect, 
  onSyncActivities, 
  onGenerateInsights,
  isSyncing,
  isGeneratingInsights 
}: HeaderProps) {
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

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onGenerateInsights}
                      disabled={isGeneratingInsights}
                    >
                      <Brain className={`h-4 w-4 mr-2 ${isGeneratingInsights ? 'animate-pulse' : ''}`} />
                      {isGeneratingInsights ? 'Generating...' : 'AI Insights'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Generate AI-powered performance insights</p>
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              <Button onClick={onStravaConnect} className="bg-strava-orange hover:bg-strava-orange/90 text-white">
                Connect Strava
              </Button>
            )}
            
            <Link href="/settings">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="text-gray-600" size={16} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
