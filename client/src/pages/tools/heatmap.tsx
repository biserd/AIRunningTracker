import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { MapPin, Activity, ArrowLeft, Info } from "lucide-react";
import { Helmet } from "react-helmet";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { decode } from "@googlemaps/polyline-codec";

interface ActivityRoute {
  id: number;
  name: string;
  distance: number;
  startDate: string;
  polyline: string | null;
}

export default function RunningHeatmapPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/auth");
    }
  }, [isAuthenticated, authLoading, setLocation]);

  const { data, isLoading, error } = useQuery<{ routes: ActivityRoute[]; count: number }>({
    queryKey: ["/api/activities/routes", user?.id],
    enabled: !!user && isAuthenticated,
  });

  const routes = data?.routes || [];
  const totalDistance = routes.reduce((sum, route) => sum + route.distance, 0);
  const distanceInMiles = totalDistance / 1609.34;
  const distanceInKm = totalDistance / 1000;
  const unitPreference = user?.unitPreference || "miles";

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || routes.length === 0) return;

    // Calculate center from first route if available
    let initialCenter: [number, number] = [37.7749, -122.4194]; // Default to SF
    let initialZoom = 14;

    if (routes.length > 0 && routes[0].polyline) {
      try {
        const firstPath = decode(routes[0].polyline);
        if (firstPath.length > 0) {
          initialCenter = [firstPath[0][0], firstPath[0][1]];
          initialZoom = 14;
        }
      } catch (e) {
        console.error("Error decoding polyline for center:", e);
      }
    }

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [routes]);

  // Render routes on map
  useEffect(() => {
    if (!mapRef.current || !routes.length) return;

    const map = mapRef.current;

    // Clear existing layers (except the tile layer)
    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const allCoordinates: [number, number][] = [];

    // Add each route to the map with heatmap effect
    // All routes use the same color but low opacity - overlapping routes will be brighter
    routes.forEach((route) => {
      if (!route.polyline) return;

      try {
        const decodedPath = decode(route.polyline);
        const latLngs: [number, number][] = decodedPath.map(([lat, lng]) => [lat, lng]);

        // Add to all coordinates for bounds calculation
        allCoordinates.push(...latLngs);

        // True heatmap effect: all routes same color, low opacity
        // Where routes overlap, opacity stacks = brighter hotspots
        const polyline = L.polyline(latLngs, {
          color: "#2563EB", // Bright blue for all routes
          weight: 4,
          opacity: 0.4, // Low opacity so overlaps create brighter areas
          smoothFactor: 1,
        });

        polyline.bindPopup(`
          <div style="font-family: sans-serif;">
            <strong style="color: #2563EB;">${route.name}</strong><br/>
            <span style="font-size: 12px; color: #666;">
              ${new Date(route.startDate).toLocaleDateString()}<br/>
              ${(route.distance / 1609.34).toFixed(2)} mi
            </span>
          </div>
        `);

        polyline.addTo(map);
      } catch (error) {
        console.error("Error decoding polyline:", error);
      }
    });

    // Center on routes and keep zoomed in for street-level view
    if (allCoordinates.length > 0) {
      const bounds = L.latLngBounds(allCoordinates);
      const center = bounds.getCenter();
      
      // Don't use fitBounds - it zooms out too much with many routes
      // Instead, center on the middle point and keep a close zoom
      map.setView(center, 14);
    }
  }, [routes]);

  if (authLoading || isLoading) {
    return (
      <>
        <Helmet>
          <title>Running Heatmap | RunAnalytics</title>
        </Helmet>
        <div className="min-h-screen bg-light-grey">
          <AppHeader />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <Skeleton className="h-[600px] w-full" />
          </div>
        </div>
      </>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Running Heatmap - Visualize Your Training Routes | RunAnalytics</title>
        <meta name="description" content="See where you run most frequently with an interactive heatmap of your last 30 activities. Discover your favorite routes and training patterns." />
        <meta property="og:title" content="Running Heatmap | RunAnalytics" />
        <meta property="og:description" content="Visualize your running routes with an interactive heatmap showing where you train most frequently." />
      </Helmet>

      <div className="min-h-screen bg-light-grey">
        <AppHeader />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-6">
            <Link href="/tools">
              <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back-tools">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tools
              </Button>
            </Link>
            
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-12 h-12 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-charcoal">Running Heatmap</h1>
                    <p className="text-gray-600">Visualize where you run most frequently</p>
                  </div>
                </div>
              </div>
              
              {/* Stats */}
              <div className="hidden sm:flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Routes Shown</p>
                  <p className="text-2xl font-bold text-blue-600" data-testid="text-routes-count">
                    {routes.length}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Distance</p>
                  <p className="text-2xl font-bold text-blue-600" data-testid="text-total-distance">
                    {unitPreference === "miles" 
                      ? `${distanceInMiles.toFixed(1)} mi`
                      : `${distanceInKm.toFixed(1)} km`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Stats */}
          <div className="sm:hidden grid grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-gray-600">Routes Shown</p>
                <p className="text-xl font-bold text-blue-600">{routes.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-gray-600">Total Distance</p>
                <p className="text-xl font-bold text-blue-600">
                  {unitPreference === "miles" 
                    ? `${distanceInMiles.toFixed(1)} mi`
                    : `${distanceInKm.toFixed(1)} km`
                  }
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Info Alert */}
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              Showing your last 30 runs with GPS data. Brighter routes indicate more recent activities. 
              Click on any route to see details.
            </AlertDescription>
          </Alert>

          {/* Error Display */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertDescription className="text-sm text-red-900">
                Error loading routes: {error.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Map Container */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {routes.length === 0 ? (
                <div className="h-[500px] flex items-center justify-center bg-gray-50">
                  <div className="text-center space-y-4 px-4">
                    <Activity className="h-16 w-16 text-gray-400 mx-auto" />
                    <div>
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">No Routes Found</h3>
                      <p className="text-gray-600 mb-4">
                        {user?.stravaConnected 
                          ? "Sync your Strava activities to see your running heatmap"
                          : "Connect Strava and sync your activities to visualize your routes"
                        }
                      </p>
                      <Link href="/settings">
                        <Button className="bg-blue-600 text-white hover:bg-blue-700" data-testid="button-go-settings">
                          Go to Settings
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  ref={mapContainerRef} 
                  className="h-[500px] sm:h-[600px] w-full"
                  data-testid="map-container"
                />
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          {routes.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Map Legend</CardTitle>
                <CardDescription>Understanding your heatmap</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-1 bg-[#2563EB] opacity-40" />
                    <span className="text-sm text-gray-700">Single route</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="relative w-8 h-1">
                      <div className="absolute w-8 h-1 bg-[#2563EB] opacity-40" />
                      <div className="absolute w-8 h-1 bg-[#2563EB] opacity-40" />
                    </div>
                    <span className="text-sm text-gray-700">Frequently used routes (brighter)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="text-xs">Click route</Badge>
                    <span className="text-sm text-gray-700">View activity details</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Footer />
      </div>
    </>
  );
}
