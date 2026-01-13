import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { MapPin, Activity, ArrowLeft, Info } from "lucide-react";
import { SEO } from "@/components/SEO";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { decode } from "@googlemaps/polyline-codec";
import { FAQSchema } from "@/components/FAQSchema";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ActivityRoute {
  id: number;
  name: string;
  distance: number;
  startDate: string;
  polyline: string | null;
}

const HEATMAP_FAQS = [
  {
    question: "How does the running heatmap work?",
    answer: "The heatmap visualizes all your Strava running routes overlaid on a single map. Routes are rendered with semi-transparent blue lines - where you run frequently, multiple routes overlap and create brighter hotspots. This instantly reveals your most-used routes, favorite neighborhoods, and training patterns. The map uses your actual GPS data from Strava activities to create an accurate visualization of your running territory."
  },
  {
    question: "Why do some areas appear brighter than others?",
    answer: "Brighter areas indicate route overlap - places you've run multiple times. When semi-transparent route lines stack on top of each other, their opacity adds up, creating the 'heat' effect. Your most frequently run routes, like regular loops from home or favorite park circuits, will glow brighter. Dimmer areas are routes you've only run once or twice. This helps you identify training patterns and discover whether you're varying your routes enough."
  },
  {
    question: "How many activities does the heatmap show?",
    answer: "The heatmap displays all your Strava running activities that have GPS data (up to your account's total). Activities without GPS tracks (treadmill runs, manually entered activities) won't appear since they have no route to visualize. The map automatically centers and zooms to show your recent running territory based on your last 10 activities, but all routes are rendered to show your complete running history."
  },
  {
    question: "Can I use the heatmap to plan new routes?",
    answer: "Yes! The heatmap helps you discover gaps in your running territory - streets or areas you haven't explored yet. Look for dim or blank areas near your common routes to find new options. You can also identify connector routes between your favorite running spots. The map uses OpenStreetMap, so you can zoom in to see street names and plan routes that add variety to your training. Varying routes reduces overuse injury risk and keeps training mentally fresh."
  },
  {
    question: "Does the heatmap update automatically when I add new runs?",
    answer: "No, the heatmap shows activities synced from your Strava account at the time you load the page. To see your latest runs, simply refresh the page after you've completed and synced a new activity to Strava. The app fetches your current activity data each time you visit the heatmap tool, ensuring you see up-to-date routes. There's no need to manually trigger a sync - just reload the page."
  },
  {
    question: "Why are some of my routes missing from the heatmap?",
    answer: "Routes may be missing if: (1) The activity has no GPS data (treadmill runs, manually entered activities), (2) The activity was marked as private in Strava and our app doesn't have permission to access it, (3) The GPS track was corrupted or incomplete during recording, or (4) The activity hasn't synced yet from your watch to Strava. Make sure activities are set to 'Followers' or 'Everyone' in Strava privacy settings, and verify they have valid GPS tracks."
  }
];

export default function RunningHeatmapPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery<{ routes: ActivityRoute[]; count: number }>({
    queryKey: ["/api/activities/routes", user?.id],
    enabled: !!user && isAuthenticated,
  });

  const routes = data?.routes || [];
  const totalDistance = routes.reduce((sum, route) => sum + route.distance, 0);
  const distanceInMiles = totalDistance / 1609.34;
  const distanceInKm = totalDistance / 1000;
  const unitPreference = user?.unitPreference || "miles";

  // Initialize map once container is rendered
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    // For authenticated users, wait for loading to finish; for unauthenticated, show immediately
    if (isAuthenticated && isLoading) return;

    // Start with default center - will be updated when routes load
    const map = L.map(mapContainerRef.current, {
      center: [40.7749, -73.95], // Default to NYC
      zoom: 13,
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
  }, [isLoading, isAuthenticated]); // Run when loading finishes and container is rendered

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
    const recentCoordinates: [number, number][] = []; // For zoom calculation

    // Add each route to the map with heatmap effect
    // All routes use the same color but low opacity - overlapping routes will be brighter
    routes.forEach((route, index) => {
      if (!route.polyline) return;

      try {
        const decodedPath = decode(route.polyline);
        const latLngs: [number, number][] = decodedPath.map(([lat, lng]) => [lat, lng]);

        // Add to all coordinates for rendering all routes
        allCoordinates.push(...latLngs);
        
        // Only use recent routes (first 10) for zoom bounds
        if (index < 10) {
          recentCoordinates.push(...latLngs);
        }

        // True heatmap effect: all routes same color, low opacity
        // Where routes overlap, opacity stacks = brighter hotspots
        const polyline = L.polyline(latLngs, {
          color: "#2563EB", // Bright blue for all routes
          weight: 4,
          opacity: 0.6, // Low opacity so overlaps create brighter areas
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

    // Fit map to recent routes (not all routes) to avoid zooming out too far
    // This focuses on where you're currently running, not old routes from other locations
    const coordinatesForZoom = recentCoordinates.length > 0 ? recentCoordinates : allCoordinates;
    
    if (coordinatesForZoom.length > 0) {
      const bounds = L.latLngBounds(coordinatesForZoom);
      
      // Fit to bounds to show recent routes
      map.fitBounds(bounds, { 
        padding: [50, 50],
        maxZoom: 14   // Don't zoom in too close
      });
    }
  }, [routes]);

  // Show skeleton only for authenticated users while loading their data
  if (authLoading || (isAuthenticated && isLoading)) {
    return (
      <>
        <SEO
          title="Running Heatmap | Visualize Your Training Routes | RunAnalytics"
          description="See your most-run routes on an interactive heatmap. Discover training patterns and favorite paths from your Strava activities."
          keywords="running heatmap, training routes, Strava heatmap, route visualization, running patterns"
          url="https://aitracker.run/tools/heatmap"
          structuredData={{
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Running Heatmap",
            "applicationCategory": "HealthApplication",
            "operatingSystem": "Web",
            "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
            "description": "See your most-run routes on an interactive heatmap. Discover training patterns and favorite paths from your Strava activities."
          }}
        />
        <div className="min-h-screen bg-light-grey">
          <AppHeader />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <Skeleton className="h-[600px] w-full" />
          </div>
        </div>
      </>
    );
  }

  // For non-authenticated users, show the empty map with CTA
  const showSignUpCTA = !isAuthenticated;

  return (
    <>
      <SEO
        title="Running Heatmap | Visualize Your Training Routes | RunAnalytics"
        description="See your most-run routes on an interactive heatmap. Discover training patterns and favorite paths from your Strava activities."
        keywords="running heatmap, training routes, Strava heatmap, route visualization, running patterns"
        url="https://aitracker.run/tools/heatmap"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Running Heatmap",
          "applicationCategory": "HealthApplication",
          "operatingSystem": "Web",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
          "description": "See your most-run routes on an interactive heatmap. Discover training patterns and favorite paths from your Strava activities."
        }}
      />
      <FAQSchema faqs={HEATMAP_FAQS} />

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
                    <p className="text-gray-600">Visualize where you run most frequently. 
                    Discover more <Link href="/blog/best-strava-analytics-tools-2026" className="text-blue-600 hover:text-blue-800 underline">Strava analytics tools</Link>.</p>
                  </div>
                </div>
              </div>
              
              {/* Stats - only show for authenticated users */}
              {isAuthenticated && (
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
              )}
            </div>
          </div>

          {/* Mobile Stats - only show for authenticated users */}
          {isAuthenticated && (
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
          )}

          {/* Info Alert - only show for authenticated users */}
          {isAuthenticated && (
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                Showing your last 30 runs with GPS data. Brighter routes indicate more recent activities. 
                Click on any route to see details.
              </AlertDescription>
            </Alert>
          )}

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
              {showSignUpCTA ? (
                /* Empty map with CTA for non-authenticated users */
                <div className="relative h-[500px] sm:h-[600px]">
                  <div 
                    ref={mapContainerRef} 
                    className="h-full w-full"
                    data-testid="map-container"
                  />
                  {/* CTA Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                    <div className="text-center space-y-4 px-6 py-8 bg-white rounded-xl shadow-2xl max-w-md mx-4">
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                        <MapPin className="h-8 w-8 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">See Your Running Heatmap</h3>
                        <p className="text-gray-600 mb-6">
                          Connect your Strava account to visualize all your routes on an interactive heatmap. 
                          Discover your most-run paths and explore new territory.
                        </p>
                        <Link href="/auth">
                          <Button size="lg" className="bg-blue-600 text-white hover:bg-blue-700 w-full sm:w-auto" data-testid="button-sign-up-cta">
                            Sign Up Free
                          </Button>
                        </Link>
                        <p className="text-sm text-gray-500 mt-3">
                          Already have an account? <Link href="/auth" className="text-blue-600 hover:underline">Log in</Link>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : routes.length === 0 ? (
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

          {/* Legend - only show for authenticated users with routes */}
          {isAuthenticated && routes.length > 0 && (
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

          {/* FAQ Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
              <CardDescription>
                Learn how to use and interpret your running heatmap
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {HEATMAP_FAQS.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>

        <Footer />
      </div>
    </>
  );
}
