import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, useManageSubscription, useFeatureAccess } from "@/hooks/useSubscription";
import type { DashboardData } from "@/lib/api";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Unlink, RefreshCw, Trash2, Crown, Star, Zap, CreditCard, ExternalLink, Loader2, Share2, Check, AlertTriangle, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

interface SyncProgress {
  current: number;
  total: number;
  activityName: string;
  status: 'syncing' | 'insights' | 'complete' | 'error';
  errorMessage?: string;
}

function SettingsPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { subscription, plan, status, isPro, isPremium, isLoading: subscriptionLoading, isReverseTrial } = useSubscription();
  const { canAccessUnlimitedHistory } = useFeatureAccess();
  const manageSubscription = useManageSubscription();
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);

  const { data: dashboardData } = useQuery<DashboardData>({
    queryKey: [`/api/dashboard/${user!.id}`],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const [unitPreference, setUnitPreference] = useState("km");
  const [stravaBrandingEnabled, setStravaBrandingEnabled] = useState(false);
  const [stravaBrandingTemplate, setStravaBrandingTemplate] = useState("🏃 Runner Score: {score} | {insight} — Analyzed with AITracker.run");

  useEffect(() => {
    if (dashboardData?.user?.unitPreference) {
      setUnitPreference(dashboardData.user.unitPreference);
    }
    if (dashboardData?.user?.stravaBrandingEnabled !== undefined) {
      setStravaBrandingEnabled(dashboardData.user.stravaBrandingEnabled);
    }
    if (dashboardData?.user?.stravaBrandingTemplate) {
      setStravaBrandingTemplate(dashboardData.user.stravaBrandingTemplate);
    }
  }, [dashboardData]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: { unitPreference: string }) => {
      return apiRequest(`/api/users/${user!.id}/settings`, "PATCH", settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${user!.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/chart', user!.id] });
      toast({
        title: "Settings updated",
        description: "Your preferences have been saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const disconnectStravaMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/strava/disconnect/${user!.id}`, "POST");
    },
    onSuccess: () => {
      // Invalidate all relevant caches to reflect disconnected state
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${user!.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: [`/api/chart/${user!.id}`] });
      toast({
        title: "Strava disconnected",
        description: "Your Strava account has been disconnected successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Disconnect failed",
        description: error.message || "Failed to disconnect Strava",
        variant: "destructive",
      });
    },
  });

  const updateBrandingMutation = useMutation({
    mutationFn: async (settings: { stravaBrandingEnabled: boolean; stravaBrandingTemplate: string }) => {
      return apiRequest(`/api/users/${user!.id}/branding`, "PATCH", settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${user!.id}`] });
      toast({
        title: "Branding settings updated",
        description: stravaBrandingEnabled 
          ? "Your Strava activities will now include AITracker insights" 
          : "Strava branding has been disabled",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update branding settings",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/user`, "DELETE");
    },
    onSuccess: (data: any) => {
      toast({
        title: "Account deleted",
        description: data.message || "Your account has been permanently deleted. A confirmation email has been sent.",
      });
      // Clear local storage and redirect to home
      localStorage.removeItem("token");
      setTimeout(() => {
        setLocation("/");
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateSettingsMutation.mutate({ unitPreference });
  };

  const handleDisconnectStrava = () => {
    if (confirm("Are you sure you want to disconnect your Strava account? This will remove access to your Strava activities.")) {
      disconnectStravaMutation.mutate();
    }
  };

  const handleSyncActivities = async () => {
    if (!user) return;
    
    setSyncProgress({
      current: 0,
      total: 0,
      activityName: 'Starting sync...',
      status: 'syncing'
    });
    
    try {
      // Get SSE nonce for secure streaming
      const nonceResponse = await apiRequest(`/api/strava/sync/${user.id}/start-stream`, "POST", { maxActivities: 100 });
      const nonce = nonceResponse.sseNonce;
      
      const eventSource = new EventSource(
        `/api/strava/sync/${user.id}/stream?nonce=${encodeURIComponent(nonce)}`
      );
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'progress') {
            setSyncProgress({
              current: data.current,
              total: data.total,
              activityName: data.activityName || `Activity ${data.current}/${data.total}`,
              status: 'syncing'
            });
          } else if (data.type === 'complete') {
            const syncedCount = data.syncedCount || 0;
            if (syncedCount === 0) {
              eventSource.close();
              setSyncProgress({
                current: 0,
                total: 0,
                activityName: 'Already up to date!',
                status: 'complete'
              });
              queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${user.id}`] });
              toast({
                title: "Already synced",
                description: "Your activities are already up to date",
              });
              setTimeout(() => setSyncProgress(null), 3000);
            } else {
              setSyncProgress({
                current: syncedCount,
                total: data.totalActivities || syncedCount,
                activityName: `Synced ${syncedCount} new activities - waiting for insights...`,
                status: 'complete'
              });
              // Set a fallback timeout - if insights phase doesn't start in 15s, complete anyway
              const fallbackTimeout = setTimeout(() => {
                eventSource.close();
                queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${user.id}`] });
                queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
                toast({
                  title: "Sync complete",
                  description: `Synced ${syncedCount} new activities`,
                });
                setSyncProgress(null);
              }, 15000);
              
              // Store timeout reference to clear if insights phase starts
              (eventSource as any)._fallbackTimeout = fallbackTimeout;
            }
          } else if (data.type === 'insights') {
            // Clear fallback timeout since insights phase started
            if ((eventSource as any)._fallbackTimeout) {
              clearTimeout((eventSource as any)._fallbackTimeout);
            }
            setSyncProgress(prev => prev ? { ...prev, status: 'insights', activityName: 'Generating AI insights...' } : null);
          } else if (data.type === 'insights_complete') {
            // Clear any fallback timeout
            if ((eventSource as any)._fallbackTimeout) {
              clearTimeout((eventSource as any)._fallbackTimeout);
            }
            eventSource.close();
            queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${user.id}`] });
            queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
            toast({
              title: "Sync complete",
              description: "Activities synced and AI insights generated",
            });
            setTimeout(() => setSyncProgress(null), 2000);
          } else if (data.type === 'error') {
            // Clear any fallback timeout
            if ((eventSource as any)._fallbackTimeout) {
              clearTimeout((eventSource as any)._fallbackTimeout);
            }
            eventSource.close();
            setSyncProgress({
              current: 0,
              total: 0,
              activityName: '',
              status: 'error',
              errorMessage: data.message || 'Sync failed'
            });
          }
        } catch (parseError) {
          console.error('Error parsing SSE data:', parseError);
        }
      };
      
      eventSource.onerror = () => {
        eventSource.close();
        setSyncProgress({
          current: 0,
          total: 0,
          activityName: '',
          status: 'error',
          errorMessage: 'Connection lost during sync'
        });
      };
    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncProgress({
        current: 0,
        total: 0,
        activityName: '',
        status: 'error',
        errorMessage: error.message || 'Failed to start sync'
      });
    }
  };

  return (
    <div className="min-h-screen bg-light-grey">
      <AppHeader />
      
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Customize your running analytics experience</p>
        </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Units & Display
            </CardTitle>
            <CardDescription>
              Choose your preferred units for distance and pace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base font-medium">Distance Units</Label>
              <RadioGroup
                value={unitPreference}
                onValueChange={setUnitPreference}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="km" id="km" />
                  <Label htmlFor="km">Kilometers (km)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="miles" id="miles" />
                  <Label htmlFor="miles">Miles (mi)</Label>
                </div>
              </RadioGroup>
              <p className="text-sm text-gray-500">
                This affects how distances and pace are displayed throughout the app
              </p>
            </div>

            <div className="pt-4">
              <Button 
                onClick={handleSave}
                disabled={updateSettingsMutation.isPending}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your account details and connected services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Username</Label>
              <p className="text-gray-900">{dashboardData?.user?.name || "Loading..."}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Strava Connection</Label>
              <div className="flex items-center justify-between mt-1">
                <p className={`text-sm ${dashboardData?.user?.stravaConnected ? "text-green-600" : "text-gray-500"}`}>
                  {dashboardData?.user?.stravaConnected ? "✓ Connected" : "Not connected"}
                </p>
                {dashboardData?.user?.stravaConnected && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDisconnectStrava}
                    disabled={disconnectStravaMutation.isPending}
                    data-testid="button-disconnect-strava"
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    {disconnectStravaMutation.isPending ? "Disconnecting..." : "Disconnect"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription
            </CardTitle>
            <CardDescription>
              Your current plan and billing management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscriptionLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading subscription info...
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isPremium ? (
                      <div className="p-2 bg-yellow-100 rounded-full">
                        <Crown className="h-5 w-5 text-yellow-600" />
                      </div>
                    ) : isPro ? (
                      <div className="p-2 bg-orange-100 rounded-full">
                        <Star className="h-5 w-5 text-strava-orange" />
                      </div>
                    ) : (
                      <div className="p-2 bg-gray-100 rounded-full">
                        <Zap className="h-5 w-5 text-gray-600" />
                      </div>
                    )}
                    <div>
                      <h3 className={`font-semibold text-lg ${isPremium ? 'text-yellow-600' : isPro ? 'text-strava-orange' : 'text-gray-900'}`}>
                        {isPremium ? 'Premium' : isPro ? 'Pro' : 'Free'} Plan
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={
                          status === 'active' ? 'default' :
                          status === 'trialing' ? 'secondary' :
                          status === 'past_due' ? 'destructive' :
                          'outline'
                        }>
                          {status === 'active' ? 'Active' :
                           status === 'trialing' ? 'Trial' :
                           status === 'canceled' ? 'Canceled' :
                           status === 'past_due' ? 'Past Due' :
                           'Free Plan'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {subscription?.subscriptionEndsAt && (
                  <p className="text-sm text-gray-600">
                    {status === 'canceled' ? 'Access until: ' : 'Renews on: '}
                    {new Date(subscription.subscriptionEndsAt).toLocaleDateString()}
                  </p>
                )}

                <div className="pt-2 flex flex-wrap gap-3">
                  {subscription?.stripeSubscriptionId ? (
                    <Button 
                      onClick={() => manageSubscription.mutate()}
                      disabled={manageSubscription.isPending}
                      variant="outline"
                      className="flex items-center gap-2"
                      data-testid="button-manage-subscription"
                    >
                      {manageSubscription.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      Manage Subscription
                    </Button>
                  ) : !isPremium && (
                    <Button 
                      onClick={() => setLocation('/pricing')}
                      className="bg-strava-orange hover:bg-strava-orange/90 flex items-center gap-2" 
                      data-testid="button-upgrade-settings"
                    >
                      <Crown className="h-4 w-4" />
                      {isPro ? 'Upgrade to Premium' : 'Upgrade Plan'}
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    onClick={() => setLocation('/billing')}
                    className="flex items-center gap-2" 
                    data-testid="button-view-billing"
                  >
                    View Billing Details
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {dashboardData?.user?.stravaConnected && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Strava Activity Sync
                {!canAccessUnlimitedHistory && (
                  <Badge variant="secondary" className="bg-orange-100 text-strava-orange">
                    <Star className="h-3 w-3 mr-1" />
                    Pro
                  </Badge>
                )}
                {isReverseTrial && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    Trial
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Manually sync up to 100 activities from your Strava account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canAccessUnlimitedHistory ? (
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    By default, we import your last 100 activities when you connect Strava. 
                    Use this button to sync your latest activities and update your training data.
                  </p>
                  
                  {/* Sync Progress UI */}
                  {syncProgress ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-3 mb-3">
                        {syncProgress.status === 'syncing' && (
                          <RefreshCw className="h-5 w-5 text-strava-orange animate-spin" />
                        )}
                        {syncProgress.status === 'insights' && (
                          <Activity className="h-5 w-5 text-blue-600 animate-pulse" />
                        )}
                        {syncProgress.status === 'complete' && (
                          <Check className="h-5 w-5 text-green-600" />
                        )}
                        {syncProgress.status === 'error' && (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {syncProgress.status === 'syncing' && 'Syncing Activities...'}
                            {syncProgress.status === 'insights' && 'Generating AI Insights...'}
                            {syncProgress.status === 'complete' && 'Sync Complete!'}
                            {syncProgress.status === 'error' && 'Sync Failed'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {syncProgress.activityName}
                          </p>
                        </div>
                      </div>
                      
                      {syncProgress.status === 'syncing' && syncProgress.total > 0 && (
                        <div className="space-y-2">
                          <Progress 
                            value={(syncProgress.current / syncProgress.total) * 100} 
                            className="h-2"
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{syncProgress.current} of {syncProgress.total} activities</span>
                            <span>~{Math.ceil((syncProgress.total - syncProgress.current) * 0.5)}s remaining</span>
                          </div>
                        </div>
                      )}
                      
                      {syncProgress.status === 'insights' && (
                        <div className="space-y-2">
                          <Progress value={100} className="h-2 animate-pulse" />
                          <p className="text-xs text-gray-500">Analyzing your training data...</p>
                        </div>
                      )}
                      
                      {syncProgress.status === 'error' && (
                        <div className="mt-2">
                          <p className="text-sm text-red-600">{syncProgress.errorMessage}</p>
                          <Button 
                            onClick={() => setSyncProgress(null)}
                            variant="outline"
                            size="sm"
                            className="mt-2"
                          >
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-amber-800">
                        ⏱️ <strong>Tip:</strong> Syncing typically takes 30-60 seconds. You'll see real-time progress below.
                      </p>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleSyncActivities}
                    disabled={syncProgress !== null && syncProgress.status !== 'error'}
                    className="flex items-center gap-2"
                    data-testid="button-sync-activities"
                  >
                    <RefreshCw className={`h-4 w-4 ${syncProgress?.status === 'syncing' ? 'animate-spin' : ''}`} />
                    {syncProgress?.status === 'syncing' ? "Syncing..." : "Sync 100 Activities"}
                  </Button>
                  {dashboardData?.user?.lastSyncAt && !syncProgress && (
                    <p className="text-xs text-gray-500 mt-2">
                      Last synced: {new Date(dashboardData.user.lastSyncAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="p-3 bg-orange-100 rounded-full w-fit mx-auto mb-4">
                    <Star className="h-6 w-6 text-strava-orange" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Pro Feature</h3>
                  <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
                    Sync up to 100 Strava activities at once to get comprehensive training history and more accurate AI insights.
                  </p>
                  <Button 
                    onClick={() => setLocation('/pricing')}
                    className="bg-strava-orange hover:bg-strava-orange/90"
                    data-testid="button-upgrade-sync"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Pro
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {dashboardData?.user?.stravaConnected && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Strava Activity Branding
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Growth Feature
                </Badge>
              </CardTitle>
              <CardDescription>
                Automatically add your Runner Score and AI insights to your Strava activity descriptions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {dashboardData?.user?.stravaHasWriteScope ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="branding-toggle" className="text-base font-medium">
                        Enable Activity Branding
                      </Label>
                      <p className="text-sm text-gray-500">
                        Add AITracker insights to your Strava posts
                      </p>
                    </div>
                    <Switch
                      id="branding-toggle"
                      checked={stravaBrandingEnabled}
                      onCheckedChange={setStravaBrandingEnabled}
                      data-testid="switch-branding-toggle"
                    />
                  </div>

                  {stravaBrandingEnabled && (
                    <div className="space-y-3 pt-2 border-t">
                      <Label htmlFor="branding-template" className="text-sm font-medium">
                        Message Template
                      </Label>
                      <Input
                        id="branding-template"
                        value={stravaBrandingTemplate}
                        onChange={(e) => setStravaBrandingTemplate(e.target.value)}
                        placeholder="🏃 Runner Score: {score} | {insight} — Analyzed with AITracker.run"
                        data-testid="input-branding-template"
                      />
                      <p className="text-xs text-gray-500">
                        Use <code className="bg-gray-100 px-1 rounded">{"{score}"}</code> for your Runner Score and <code className="bg-gray-100 px-1 rounded">{"{insight}"}</code> for a quick AI insight
                      </p>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                        <p className="text-sm text-blue-800">
                          <strong>Preview:</strong> {stravaBrandingTemplate
                            .replace("{score}", "85")
                            .replace("{insight}", "Great pacing consistency!")}
                        </p>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => updateBrandingMutation.mutate({ 
                      stravaBrandingEnabled, 
                      stravaBrandingTemplate 
                    })}
                    disabled={updateBrandingMutation.isPending}
                    className="flex items-center gap-2"
                    data-testid="button-save-branding"
                  >
                    {updateBrandingMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {updateBrandingMutation.isPending ? "Saving..." : "Save Branding Settings"}
                  </Button>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="p-3 bg-amber-100 rounded-full w-fit mx-auto mb-4">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Additional Permission Required</h3>
                  <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
                    To add insights to your Strava activities, you need to grant write permission. 
                    This is a one-time authorization.
                  </p>
                  <Button 
                    onClick={() => {
                      const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID || "default_client_id";
                      const redirectUri = `${window.location.origin}/strava/callback`;
                      const scope = "read,activity:read_all,activity:write";
                      const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}&state=${user!.id}`;
                      window.location.href = stravaAuthUrl;
                    }}
                    className="bg-[#FC5200] hover:bg-[#e04900]"
                    data-testid="button-reauth-strava"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Grant Write Permission
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Account
            </CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">⚠️ Warning: This action cannot be undone</h4>
              <p className="text-sm text-red-700 mb-3">
                Deleting your account will permanently remove:
              </p>
              <ul className="text-sm text-red-700 space-y-1 list-disc list-inside ml-2">
                <li>Your user profile and account information</li>
                <li>All Strava activity data and connections</li>
                <li>AI-generated insights and training plans</li>
                <li>Goals and progress tracking</li>
                <li>All other personal data</li>
              </ul>
              <p className="text-sm text-red-700 mt-3 font-medium">
                This deletion complies with GDPR regulations. You will receive a confirmation email once your data is deleted.
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="flex items-center gap-2"
                  disabled={deleteAccountMutation.isPending}
                  data-testid="button-delete-account"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleteAccountMutation.isPending ? "Deleting Account..." : "Delete My Account"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>
                      This action <strong className="text-red-600">cannot be undone</strong>. This will permanently delete your account and remove all your data from our servers.
                    </p>
                    <p>
                      All your running activities, insights, training plans, and goals will be lost forever.
                    </p>
                    <p className="font-medium">
                      Are you sure you want to proceed with deleting your account?
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteAccountMutation.mutate()}
                    className="bg-red-600 hover:bg-red-700"
                    data-testid="button-confirm-delete"
                  >
                    Yes, Delete My Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-strava-orange mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <SettingsPageContent />;
}