import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Activity, RefreshCw, Brain, User, Settings, LogOut, Bell } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { StravaConnectButton } from "@/components/StravaConnect";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { NotificationOutbox } from "@shared/schema";

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

  const { data: notificationsData } = useQuery<{ notifications: NotificationOutbox[]; unreadCount: number }>({
    queryKey: ['/api/notifications'],
    refetchInterval: 60000,
    enabled: !!user,
  });

  const unreadCount = notificationsData?.unreadCount || 0;
  const notifications = notificationsData?.notifications || [];
  const recentNotifications = notifications.slice(0, 5);

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/notifications/read-all', 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest(`/api/notifications/${notificationId}/read`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const handleNotificationClick = (notification: NotificationOutbox) => {
    if (!notification.readAt) {
      markReadMutation.mutate(notification.id);
    }
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
            
            {/* Notification Bell */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="relative" data-testid="button-notifications">
                  <Bell className="h-5 w-5 text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium" data-testid="badge-notification-count">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0" data-testid="popover-notifications">
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs text-blue-600 h-auto py-1 px-2"
                      onClick={() => markAllReadMutation.mutate()}
                      disabled={markAllReadMutation.isPending}
                      data-testid="button-mark-all-read"
                    >
                      Mark all read
                    </Button>
                  )}
                </div>
                {recentNotifications.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto">
                    {recentNotifications.map((notification) => (
                      <Link
                        key={notification.id}
                        href={notification.type === 'activity_recap' && (notification.data as any)?.activityId 
                          ? `/activity/${(notification.data as any).activityId}` 
                          : '/dashboard'}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div 
                          className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${!notification.readAt ? 'bg-blue-50' : ''}`}
                          data-testid={`notification-item-${notification.id}`}
                        >
                          <div className="flex items-start gap-2">
                            {!notification.readAt && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900 truncate">{notification.title}</p>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notification.body}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {notification.createdAt ? new Date(notification.createdAt).toLocaleDateString() : ''}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No notifications yet</p>
                  </div>
                )}
              </PopoverContent>
            </Popover>

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
