import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { DashboardData } from "@/lib/api";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Unlink } from "lucide-react";

function SettingsPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: dashboardData } = useQuery<DashboardData>({
    queryKey: [`/api/dashboard/${user!.id}`],
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

  const handleSave = () => {
    updateSettingsMutation.mutate({ unitPreference });
  };

  const handleDisconnectStrava = () => {
    if (confirm("Are you sure you want to disconnect your Strava account? This will remove access to your Strava activities.")) {
      disconnectStravaMutation.mutate();
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
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    {disconnectStravaMutation.isPending ? "Disconnecting..." : "Disconnect"}
                  </Button>
                )}
              </div>
            </div>
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