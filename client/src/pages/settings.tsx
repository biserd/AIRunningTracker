import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { DashboardData } from "@/lib/api";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Settings, Save, Unlink, RefreshCw, Trash2, Key, Plus, Copy, ExternalLink, Eye, EyeOff } from "lucide-react";

interface ApiKeyData {
  id: number;
  name: string;
  scopes: string[];
  keyHint: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface NewApiKeyResponse {
  id: number;
  name: string;
  scopes: string[];
  keyHint: string;
  key: string;
  createdAt: string;
  message: string;
}

function SettingsPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: dashboardData } = useQuery<DashboardData>({
    queryKey: [`/api/dashboard/${user!.id}`],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const [unitPreference, setUnitPreference] = useState("km");
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["activities"]);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (dashboardData?.user?.unitPreference) {
      setUnitPreference(dashboardData.user.unitPreference);
    }
  }, [dashboardData]);

  const { data: apiKeys, isLoading: apiKeysLoading } = useQuery<ApiKeyData[]>({
    queryKey: ['/api/keys'],
    queryFn: getQueryFn({ on401: "throw" }),
  });

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

  const createApiKeyMutation = useMutation({
    mutationFn: async (data: { name: string; scopes: string[] }) => {
      return apiRequest('/api/keys', 'POST', data);
    },
    onSuccess: (data: NewApiKeyResponse) => {
      queryClient.invalidateQueries({ queryKey: ['/api/keys'] });
      setNewlyCreatedKey(data.key);
      setShowNewKey(true);
      setNewKeyName("");
      setSelectedScopes(["activities"]);
      toast({
        title: "API Key Created",
        description: "Copy your new API key now - you won't be able to see it again!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create API key",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const deleteApiKeyMutation = useMutation({
    mutationFn: async (keyId: number) => {
      return apiRequest(`/api/keys/${keyId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/keys'] });
      toast({
        title: "API Key Deleted",
        description: "The API key has been permanently revoked",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete API key",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleCreateApiKey = () => {
    if (!newKeyName.trim()) {
      toast({ title: "Error", description: "Please enter a name for your API key", variant: "destructive" });
      return;
    }
    if (selectedScopes.length === 0) {
      toast({ title: "Error", description: "Please select at least one scope", variant: "destructive" });
      return;
    }
    createApiKeyMutation.mutate({ name: newKeyName.trim(), scopes: selectedScopes });
  };

  const handleCopyKey = () => {
    if (newlyCreatedKey) {
      navigator.clipboard.writeText(newlyCreatedKey);
      toast({ title: "Copied!", description: "API key copied to clipboard" });
    }
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev => 
      prev.includes(scope) 
        ? prev.filter(s => s !== scope)
        : [...prev, scope]
    );
  };

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription>
              Create API keys to access your data programmatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  API keys allow external applications to access your running data.
                </p>
                <a 
                  href="/developers/api" 
                  className="text-sm text-strava-orange hover:underline flex items-center gap-1 mt-1"
                  data-testid="link-api-docs"
                >
                  <ExternalLink className="h-3 w-3" />
                  View API Documentation
                </a>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    className="flex items-center gap-2"
                    disabled={(apiKeys?.length || 0) >= 5}
                    data-testid="button-create-api-key"
                  >
                    <Plus className="h-4 w-4" />
                    Create API Key
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New API Key</DialogTitle>
                    <DialogDescription>
                      Give your key a name and select what data it can access.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="key-name">Key Name</Label>
                      <Input
                        id="key-name"
                        placeholder="e.g., My Training App"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        data-testid="input-api-key-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Scopes (What this key can access)</Label>
                      <div className="space-y-2">
                        {[
                          { id: "activities", label: "Activities", desc: "Read your running activities" },
                          { id: "insights", label: "AI Insights", desc: "Read AI-generated insights" },
                          { id: "training_plans", label: "Training Plans", desc: "Read training plans" },
                          { id: "goals", label: "Goals", desc: "Read your goals and progress" },
                        ].map((scope) => (
                          <div key={scope.id} className="flex items-start space-x-2">
                            <Checkbox
                              id={scope.id}
                              checked={selectedScopes.includes(scope.id)}
                              onCheckedChange={() => toggleScope(scope.id)}
                              data-testid={`checkbox-scope-${scope.id}`}
                            />
                            <div className="grid gap-0.5 leading-none">
                              <label
                                htmlFor={scope.id}
                                className="text-sm font-medium leading-none cursor-pointer"
                              >
                                {scope.label}
                              </label>
                              <p className="text-xs text-muted-foreground">{scope.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" data-testid="button-cancel-create-key">Cancel</Button>
                    </DialogClose>
                    <Button 
                      onClick={handleCreateApiKey}
                      disabled={createApiKeyMutation.isPending}
                      data-testid="button-confirm-create-key"
                    >
                      {createApiKeyMutation.isPending ? "Creating..." : "Create Key"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {newlyCreatedKey && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Your New API Key
                </h4>
                <p className="text-sm text-green-700 mb-3">
                  Copy this key now - you won't be able to see it again!
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border rounded px-3 py-2 text-sm font-mono break-all">
                    {showNewKey ? newlyCreatedKey : "••••••••••••••••••••••••••••••••"}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowNewKey(!showNewKey)}
                    data-testid="button-toggle-key-visibility"
                  >
                    {showNewKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyKey}
                    data-testid="button-copy-api-key"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-green-700"
                  onClick={() => {
                    setNewlyCreatedKey(null);
                    setIsCreateDialogOpen(false);
                  }}
                  data-testid="button-dismiss-new-key"
                >
                  I've copied my key
                </Button>
              </div>
            )}

            {apiKeysLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-strava-orange mx-auto" />
              </div>
            ) : apiKeys && apiKeys.length > 0 ? (
              <div className="space-y-3">
                <Label className="text-base font-medium">Your API Keys</Label>
                {apiKeys.map((key) => (
                  <div 
                    key={key.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    data-testid={`api-key-item-${key.id}`}
                  >
                    <div>
                      <p className="font-medium">{key.name}</p>
                      <p className="text-xs text-gray-500">
                        Key ending in ...{key.keyHint} • Created {new Date(key.createdAt).toLocaleDateString()}
                        {key.lastUsedAt && ` • Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Scopes: {key.scopes.join(", ")}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`button-delete-key-${key.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently revoke the API key "{key.name}". Any applications using this key will stop working immediately.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteApiKeyMutation.mutate(key.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete Key
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No API keys yet</p>
                <p className="text-sm">Create a key to start using the API</p>
              </div>
            )}

            {(apiKeys?.length || 0) >= 5 && (
              <p className="text-sm text-amber-600">
                You've reached the maximum of 5 API keys. Delete an existing key to create a new one.
              </p>
            )}
          </CardContent>
        </Card>

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