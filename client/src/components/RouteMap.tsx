import { useEffect, useRef } from 'react';
import { decode } from '@googlemaps/polyline-codec';

interface RouteMapProps {
  polyline?: string;
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
  className?: string;
}

export default function RouteMap({ polyline, startLat, startLng, endLat, endLng, className = '' }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // If we have polyline data, decode it and create a detailed map
    if (polyline) {
      try {
        const coordinates = decode(polyline);
        
        if (coordinates.length > 0) {
          // Calculate bounds for the route
          let minLat = coordinates[0][0], maxLat = coordinates[0][0];
          let minLng = coordinates[0][1], maxLng = coordinates[0][1];
          
          coordinates.forEach(([lat, lng]) => {
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
          });

          // Add padding to bounds
          const latPadding = (maxLat - minLat) * 0.1;
          const lngPadding = (maxLng - minLng) * 0.1;
          
          // Create an SVG visualization of the route
          const svgWidth = 400;
          const svgHeight = 300;
          
          // Convert coordinates to SVG space
          const svgCoordinates = coordinates.map(([lat, lng]) => {
            const x = ((lng - (minLng - lngPadding)) / ((maxLng + lngPadding) - (minLng - lngPadding))) * svgWidth;
            const y = svgHeight - ((lat - (minLat - latPadding)) / ((maxLat + latPadding) - (minLat - latPadding))) * svgHeight;
            return [x, y];
          });
          
          // Create SVG path
          const pathData = svgCoordinates.map(([x, y], index) => 
            `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
          ).join(' ');
          
          // Create encoded polyline URL for Strava-style map
          const encodedPolyline = encodeURIComponent(polyline);
          const centerLat = (minLat + maxLat) / 2;
          const centerLng = (minLng + maxLng) / 2;
          
          // Calculate appropriate zoom level based on bounds
          const latDelta = maxLat - minLat;
          const lngDelta = maxLng - minLng;
          const maxDelta = Math.max(latDelta, lngDelta);
          
          let zoom = 15;
          if (maxDelta > 0.1) zoom = 11;
          else if (maxDelta > 0.05) zoom = 12;
          else if (maxDelta > 0.02) zoom = 13;
          else if (maxDelta > 0.01) zoom = 14;

          // Use a static map service that can render polylines
          mapRef.current.innerHTML = `
            <div class="relative w-full h-full rounded-lg overflow-hidden bg-gray-100">
              <!-- Static map with route -->
              <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
                <div class="text-center p-4">
                  <div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7"></path>
                    </svg>
                  </div>
                  <h3 class="text-lg font-semibold text-gray-800 mb-2">GPS Route Visualization</h3>
                  <p class="text-sm text-gray-600 mb-3">Complete running route with ${coordinates.length} GPS points</p>
                  
                  <!-- Route visualization as a simplified path -->
                  <svg width="280" height="180" class="mx-auto border border-gray-200 rounded-lg bg-white shadow-sm">
                    <defs>
                      <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" stroke-width="1"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#smallGrid)" />
                    
                    <!-- Simplified route path -->
                    <path d="${svgCoordinates.map(([x, y], index) => 
                      `${index === 0 ? 'M' : 'L'} ${(x * 280 / svgWidth).toFixed(1)} ${(y * 180 / svgHeight).toFixed(1)}`
                    ).join(' ')}" 
                          fill="none" 
                          stroke="#ff6b35" 
                          stroke-width="3" 
                          stroke-linecap="round" 
                          stroke-linejoin="round" />
                    
                    <!-- Start marker -->
                    <circle cx="${(svgCoordinates[0][0] * 280 / svgWidth).toFixed(1)}" 
                            cy="${(svgCoordinates[0][1] * 180 / svgHeight).toFixed(1)}" 
                            r="5" 
                            fill="#22c55e" 
                            stroke="white" 
                            stroke-width="2" />
                    
                    <!-- End marker -->
                    <circle cx="${(svgCoordinates[svgCoordinates.length - 1][0] * 280 / svgWidth).toFixed(1)}" 
                            cy="${(svgCoordinates[svgCoordinates.length - 1][1] * 180 / svgHeight).toFixed(1)}" 
                            r="5" 
                            fill="#ef4444" 
                            stroke="white" 
                            stroke-width="2" />
                    
                    <!-- Distance markers along the path (every 20% of route) -->
                    ${Array.from({length: 4}, (_, i) => {
                      const index = Math.floor((i + 1) * coordinates.length / 5);
                      const coord = svgCoordinates[index];
                      if (!coord) return '';
                      return `<circle cx="${(coord[0] * 280 / svgWidth).toFixed(1)}" 
                                      cy="${(coord[1] * 180 / svgHeight).toFixed(1)}" 
                                      r="2" 
                                      fill="#6b7280" 
                                      opacity="0.6" />`;
                    }).join('')}
                  </svg>
                  
                  <div class="mt-4 grid grid-cols-2 gap-4 text-xs text-gray-600">
                    <div class="flex items-center">
                      <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span>Start: ${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}</span>
                    </div>
                    <div class="flex items-center">
                      <div class="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      <span>Distance: ${(coordinates.length * 0.01).toFixed(1)}km approx</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
                <div class="flex items-center space-x-4 text-sm">
                  <div class="flex items-center space-x-1">
                    <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span class="text-gray-700 font-medium">Start</span>
                  </div>
                  <div class="flex items-center space-x-1">
                    <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span class="text-gray-700 font-medium">Finish</span>
                  </div>
                </div>
                <div class="text-xs text-green-600 mt-1 font-medium">
                  ✓ Complete GPS route (${coordinates.length} points)
                </div>
              </div>
            </div>
          `;
        }
      } catch (error) {
        console.error('Error decoding polyline:', error);
        renderFallbackMap();
      }
    } else if (startLat && startLng) {
      renderFallbackMap();
    } else {
      renderNoGpsMessage();
    }

    function renderFallbackMap() {
      if (!startLat || !startLng) return;
      
      const endLatFinal = endLat || startLat;
      const endLngFinal = endLng || startLng;
      
      const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${startLng - 0.01},${startLat - 0.01},${endLngFinal + 0.01},${endLatFinal + 0.01}&layer=mapnik&marker=${startLat},${startLng}`;
      
      mapRef.current!.innerHTML = `
        <div class="relative w-full h-full">
          <iframe 
            src="${embedUrl}" 
            class="w-full h-full rounded-lg border-0"
            title="Activity Route Map">
          </iframe>
          <div class="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
            <div class="flex items-center space-x-4 text-sm">
              <div class="flex items-center space-x-1">
                <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                <span class="text-gray-700 font-medium">Start</span>
              </div>
              ${endLat && endLng ? `
                <div class="flex items-center space-x-1">
                  <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span class="text-gray-700 font-medium">Finish</span>
                </div>
              ` : ''}
            </div>
            <div class="text-xs text-gray-600 mt-1">
              ${startLat.toFixed(4)}, ${startLng.toFixed(4)}
            </div>
          </div>
        </div>
      `;
    }

    function renderNoGpsMessage() {
      mapRef.current!.innerHTML = `
        <div class="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
          <div class="text-center text-gray-500">
            <svg class="h-8 w-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            <p class="text-sm">No GPS data available</p>
            <p class="text-xs">Route tracking was not enabled for this activity</p>
          </div>
        </div>
      `;
    }
  }, [polyline, startLat, startLng, endLat, endLng]);

  return <div ref={mapRef} className={`aspect-video ${className}`} />;
}