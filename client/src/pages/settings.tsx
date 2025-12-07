import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, useManageSubscription } from "@/hooks/useSubscription";
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
import { Settings, Save, Unlink, RefreshCw, Trash2, Crown, Star, Zap, CreditCard, ExternalLink, Loader2 } from "lucide-react";

function SettingsPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { subscription, plan, status, isPro, isPremium, isLoading: subscriptionLoading } = useSubscription();
  const manageSubscription = useManageSubscription();

  const { data: dashboardData } = useQuery<DashboardData>({
    queryKey: [`/api/dashboard/${user!.id}`],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const [unitPreference, setUnitPreference] = useState("km");

  useEffect(() => {
    if (dashboardData?.user?.unitPreference) {
      setUnitPreference(dashboardData.user.unitPreference);
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
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${user!.id}`] });
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

  const syncActivitiesMutation = useMutation({
    mutationFn: async (maxActivities: number = 100) => {
      return apiRequest(`/api/strava/sync-activities`, "POST", { maxActivities });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${user!.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      toast({
        title: "Activities synced",
        description: data.message || `Synced ${data.syncedCount} new activities`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync activities",
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

  const handleSyncActivities = () => {
    syncActivitiesMutation.mutate(100);
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
                  ) : (
                    <Button 
                      onClick={() => setLocation('/pricing')}
                      className="bg-strava-orange hover:bg-strava-orange/90 flex items-center gap-2" 
                      data-testid="button-upgrade-settings"
                    >
                      <Crown className="h-4 w-4" />
                      Upgrade Plan
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
              <CardTitle>Strava Activity Sync</CardTitle>
              <CardDescription>
                Manually sync more activities from your Strava account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  By default, we import your last 100 activities when you connect Strava. 
                  Use this button to sync your latest activities and update your training data.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-amber-800">
                    ⏱️ <strong>Please be patient:</strong> Syncing activities can take over a minute, especially if you have many activities. 
                    The page will update automatically when complete.
                  </p>
                </div>
                <Button 
                  onClick={handleSyncActivities}
                  disabled={syncActivitiesMutation.isPending}
                  className="flex items-center gap-2"
                  data-testid="button-sync-activities"
                >
                  <RefreshCw className={`h-4 w-4 ${syncActivitiesMutation.isPending ? 'animate-spin' : ''}`} />
                  {syncActivitiesMutation.isPending ? "Syncing Activities..." : "Sync More Activities"}
                </Button>
                {dashboardData?.user?.lastSyncAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    Last synced: {new Date(dashboardData.user.lastSyncAt).toLocaleString()}
                  </p>
                )}
              </div>
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