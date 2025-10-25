import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface SyncProgressProps {
  current: number;
  total: number;
  activityName: string;
  status: 'syncing' | 'insights' | 'complete' | 'error';
  errorMessage?: string;
}

export function SyncProgress({ current, total, activityName, status, errorMessage }: SyncProgressProps) {
  const progress = total > 0 ? (current / total) * 100 : 0;
  
  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-5 h-5 text-green-500" data-testid="icon-complete" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" data-testid="icon-error" />;
      default:
        return <Loader2 className="w-5 h-5 animate-spin text-orange-500" data-testid="icon-syncing" />;
    }
  };
  
  const getStatusMessage = () => {
    switch (status) {
      case 'insights':
        return 'Generating AI insights...';
      case 'complete':
        return `Successfully synced ${current} activities!`;
      case 'error':
        return errorMessage || 'Sync failed';
      default:
        return activityName || 'Syncing activities...';
    }
  };
  
  return (
    <Card className="border-orange-200 dark:border-orange-800" data-testid="card-sync-progress">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {getStatusIcon()}
          <span data-testid="text-sync-status">Syncing from Strava</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {status !== 'error' && (
          <Progress 
            value={status === 'complete' ? 100 : progress} 
            className="h-2"
            data-testid="progress-sync"
          />
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400" data-testid="text-progress-count">
            {status === 'complete' || status === 'insights' 
              ? `${current} of ${total} activities` 
              : `${current} / ${total}`}
          </span>
          <span className="text-gray-600 dark:text-gray-400" data-testid="text-progress-percent">
            {Math.round(progress)}%
          </span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 truncate" data-testid="text-activity-name">
          {getStatusMessage()}
        </p>
      </CardContent>
    </Card>
  );
}
