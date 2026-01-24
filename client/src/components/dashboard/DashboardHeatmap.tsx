import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { MapPin, ExternalLink } from "lucide-react";
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

export default function DashboardHeatmap() {
  const { user, isAuthenticated } = useAuth();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery<{ routes: ActivityRoute[]; count: number }>({
    queryKey: ["/api/activities/routes", user?.id],
    enabled: !!user && isAuthenticated,
  });

  const routes = data?.routes || [];
  const routeCount = routes.filter(r => r.polyline).length;

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    if (isLoading) return;

    const map = L.map(mapContainerRef.current, {
      center: [40.7749, -73.95],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [isLoading]);

  useEffect(() => {
    if (!mapRef.current || !routes.length) return;

    const map = mapRef.current;

    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const recentCoordinates: [number, number][] = [];

    routes.forEach((route, index) => {
      if (!route.polyline) return;

      try {
        const decodedPath = decode(route.polyline);
        const latLngs: [number, number][] = decodedPath.map(([lat, lng]) => [lat, lng]);

        if (index < 10) {
          recentCoordinates.push(...latLngs);
        }

        const polyline = L.polyline(latLngs, {
          color: "#2563EB",
          weight: 3,
          opacity: 0.5,
          smoothFactor: 1,
        });

        polyline.addTo(map);
      } catch (error) {
        console.error("Error decoding polyline:", error);
      }
    });

    if (recentCoordinates.length > 0) {
      const bounds = L.latLngBounds(recentCoordinates);
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 13 });
    }
  }, [routes]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-sm border-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg font-semibold">Running Heatmap</CardTitle>
          </div>
          <Link href="/tools/heatmap">
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 gap-1">
              View Full Map
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : routeCount === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <MapPin className="h-12 w-12 text-gray-300 dark:text-gray-500 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
              No GPS routes available yet.<br />
              Complete some outdoor runs to see your heatmap!
            </p>
          </div>
        ) : (
          <div className="relative">
            <div
              ref={mapContainerRef}
              className="h-64 w-full rounded-lg overflow-hidden"
              style={{ zIndex: 0 }}
            />
            <div className="absolute bottom-2 left-2 bg-white/90 dark:bg-gray-800/90 px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-300">
              {routeCount} routes
            </div>
            <Link href="/tools/heatmap">
              <div className="absolute inset-0 cursor-pointer hover:bg-black/5 transition-colors rounded-lg" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
