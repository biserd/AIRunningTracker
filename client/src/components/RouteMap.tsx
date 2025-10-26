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

          // Create Google Static Maps URL with polyline
          const bbox = [
            minLng - lngPadding,
            minLat - latPadding,
            maxLng + lngPadding,
            maxLat + latPadding
          ].join(',');

          // Create Leaflet-based map with the route
          mapRef.current.innerHTML = `
            <div class="relative w-full h-full rounded-lg overflow-hidden">
              <!-- OpenStreetMap iframe as base -->
              <iframe 
                src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${centerLat},${centerLng}"
                class="w-full h-full absolute inset-0"
                style="border: none;"
                title="Running Route Map">
              </iframe>
              
              <!-- Route overlay using canvas -->
              <canvas id="routeCanvas" 
                      class="absolute inset-0 w-full h-full pointer-events-none"
                      style="mix-blend-mode: multiply;">
              </canvas>
              
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
                  ✓ GPS route (${coordinates.length} points)
                </div>
              </div>
            </div>
          `;

          // Draw the route on canvas after iframe loads
          setTimeout(() => {
            const canvas = document.getElementById('routeCanvas') as HTMLCanvasElement;
            if (canvas) {
              const ctx = canvas.getContext('2d');
              if (ctx) {
                // Set canvas size to match container
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
                
                // Convert GPS coordinates to canvas coordinates
                const canvasCoords = coordinates.map(([lat, lng]) => {
                  const x = ((lng - (minLng - lngPadding)) / ((maxLng + lngPadding) - (minLng - lngPadding))) * canvas.width;
                  const y = canvas.height - ((lat - (minLat - latPadding)) / ((maxLat + latPadding) - (minLat - latPadding))) * canvas.height;
                  return [x, y];
                });

                // Draw route path
                ctx.strokeStyle = '#ff6b35';
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.globalAlpha = 0.8;
                
                ctx.beginPath();
                canvasCoords.forEach(([x, y], index) => {
                  if (index === 0) {
                    ctx.moveTo(x, y);
                  } else {
                    ctx.lineTo(x, y);
                  }
                });
                ctx.stroke();

                // Draw start marker
                const [startX, startY] = canvasCoords[0];
                ctx.globalAlpha = 1;
                ctx.fillStyle = '#22c55e';
                ctx.beginPath();
                ctx.arc(startX, startY, 8, 0, 2 * Math.PI);
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 3;
                ctx.stroke();

                // Draw end marker
                const [endX, endY] = canvasCoords[canvasCoords.length - 1];
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(endX, endY, 8, 0, 2 * Math.PI);
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 3;
                ctx.stroke();
              }
            }
          }, 1000);
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