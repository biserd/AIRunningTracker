import { useEffect, useRef } from 'react';
import { decode } from '@googlemaps/polyline-codec';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  const leafletMapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clean up previous map instance
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    // If we have polyline data, decode it and create a detailed map
    if (polyline) {
      try {
        const coordinates = decode(polyline);
        
        if (coordinates.length > 0) {
          // Initialize Leaflet map
          const map = L.map(mapRef.current, {
            zoomControl: true,
            attributionControl: true,
          });
          
          leafletMapRef.current = map;

          // Add OpenStreetMap tiles
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
          }).addTo(map);

          // Convert coordinates to Leaflet LatLng format
          const latLngs: L.LatLngExpression[] = coordinates.map(([lat, lng]) => [lat, lng]);

          // Draw the route polyline
          const polylineLayer = L.polyline(latLngs, {
            color: '#ff6b35',
            weight: 4,
            opacity: 0.8,
            lineJoin: 'round',
            lineCap: 'round',
          }).addTo(map);

          // Add start marker (green)
          const startIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="background-color: #22c55e; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          
          L.marker([coordinates[0][0], coordinates[0][1]], { icon: startIcon })
            .addTo(map);

          // Add end marker (red)
          const endIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          
          const lastCoord = coordinates[coordinates.length - 1];
          L.marker([lastCoord[0], lastCoord[1]], { icon: endIcon })
            .addTo(map);

          // Fit map to show entire route with some padding
          map.fitBounds(polylineLayer.getBounds(), { padding: [30, 30] });

          // Add custom legend using custom control
          const LegendControl = L.Control.extend({
            options: {
              position: 'bottomleft'
            },
            onAdd: function() {
              const div = L.DomUtil.create('div', 'bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg');
              div.innerHTML = `
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
              `;
              return div;
            }
          });
          new LegendControl().addTo(map);
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
      if (!startLat || !startLng || !mapRef.current) return;
      
      const endLatFinal = endLat || startLat;
      const endLngFinal = endLng || startLng;
      
      const map = L.map(mapRef.current, {
        center: [startLat, startLng],
        zoom: 14,
        zoomControl: true,
        attributionControl: true,
      });
      
      leafletMapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add start marker
      const startIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="background-color: #22c55e; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      
      L.marker([startLat, startLng], { icon: startIcon }).addTo(map);

      // Add end marker if different from start
      if (endLat && endLng && (endLat !== startLat || endLng !== startLng)) {
        const endIcon = L.divIcon({
          className: 'custom-marker',
          html: '<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        
        L.marker([endLat, endLng], { icon: endIcon }).addTo(map);
        
        // Fit bounds to show both markers
        map.fitBounds([[startLat, startLng], [endLat, endLng]], { padding: [50, 50] });
      }
    }

    function renderNoGpsMessage() {
      if (!mapRef.current) return;
      mapRef.current.innerHTML = `
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

    // Cleanup on unmount
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [polyline, startLat, startLng, endLat, endLng]);

  return <div ref={mapRef} className={`aspect-video rounded-lg overflow-hidden ${className}`} />;
}
