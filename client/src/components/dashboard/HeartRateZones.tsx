import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Heart, Settings, Info } from "lucide-react";

interface HeartRateZone {
  min: number;
  max: number;
  name: string;
  description: string;
}

interface HeartRateZones {
  zone1: HeartRateZone;
  zone2: HeartRateZone;
  zone3: HeartRateZone;
  zone4: HeartRateZone;
  zone5: HeartRateZone;
}

interface HeartRateZonesProps {
  userId: number;
  batchData?: any;
}

export default function HeartRateZones({ userId, batchData }: HeartRateZonesProps) {
  const [maxHR, setMaxHR] = useState<string>("");
  const [restingHR, setRestingHR] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);

  const { data: hrDataResponse, isLoading, refetch } = useQuery({
    queryKey: ['/api/performance/hr-zones', userId, maxHR, restingHR],
    queryFn: () => {
      let url = `/api/performance/hr-zones/${userId}`;
      const params = new URLSearchParams();
      if (maxHR) params.append('maxHR', maxHR);
      if (restingHR) params.append('restingHR', restingHR);
      if (params.toString()) url += `?${params.toString()}`;
      
      return fetch(url).then(res => res.json());
    },
    enabled: (batchData === undefined ? false : !batchData) || !!maxHR || !!restingHR,
  });
  
  const hrData = (maxHR || restingHR) ? hrDataResponse : (batchData?.hrZones ?? hrDataResponse);

  const zoneColors = {
    zone1: "bg-green-100 border-green-300 text-green-800",
    zone2: "bg-blue-100 border-blue-300 text-blue-800", 
    zone3: "bg-yellow-100 border-yellow-300 text-yellow-800",
    zone4: "bg-orange-100 border-orange-300 text-orange-800",
    zone5: "bg-red-100 border-red-300 text-red-800"
  };

  const handleUpdateZones = () => {
    refetch();
    setShowSettings(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-charcoal flex items-center">
            <Heart className="mr-2 h-5 w-5 text-red-500" />
            Heart Rate Zones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const heartRateZones = hrData?.heartRateZones;

  if (!heartRateZones) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-charcoal flex items-center">
            <Heart className="mr-2 h-5 w-5 text-red-500" />
            Heart Rate Zones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Heart className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p>Unable to calculate heart rate zones</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-charcoal flex items-center justify-between">
          <div className="flex items-center">
            <Heart className="mr-2 h-5 w-5 text-red-500" />
            Heart Rate Zones
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">Automatically calculated from your recent runs</p>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-3">
          {/* Settings Panel */}
          {showSettings && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
              <h4 className="font-medium text-charcoal text-sm">Customize Your Heart Rate</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="maxHR" className="text-xs">Max Heart Rate</Label>
                  <Input
                    id="maxHR"
                    type="number"
                    placeholder="190"
                    value={maxHR}
                    onChange={(e) => setMaxHR(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label htmlFor="restingHR" className="text-xs">Resting Heart Rate</Label>
                  <Input
                    id="restingHR"
                    type="number"
                    placeholder="60"
                    value={restingHR}
                    onChange={(e) => setRestingHR(e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>
              <Button onClick={handleUpdateZones} size="sm">
                Update Zones
              </Button>
            </div>
          )}

          {/* Heart Rate Zones Display - Compact */}
          <div className="space-y-1.5">
            {Object.entries(heartRateZones).map(([zoneKey, zone]) => {
              const zoneData = zone as HeartRateZone;
              return (
              <div 
                key={zoneKey}
                className={`border rounded-md px-3 py-2 ${zoneColors[zoneKey as keyof typeof zoneColors]}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-white/80 text-xs px-1.5 py-0">
                      Z{zoneKey.slice(-1)}
                    </Badge>
                    <span className="font-medium text-sm">{zoneData.name}</span>
                  </div>
                  <span className="font-bold text-sm">
                    {zoneData.min}-{zoneData.max} bpm
                  </span>
                </div>
              </div>
              );
            })}
          </div>

          {/* Training Guidelines - Compact */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Info className="h-3.5 w-3.5 text-blue-600" />
              <h4 className="font-medium text-blue-900 text-sm">Training Guidelines</h4>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
              <div>
                <strong>Zone 1-2 (80%):</strong> Aerobic base
              </div>
              <div>
                <strong>Zone 3-4 (15%):</strong> Threshold
              </div>
              <div>
                <strong>Zone 5 (5%):</strong> VO2 max
              </div>
              <div>
                <strong>Recovery:</strong> Stay in Zone 1
              </div>
            </div>
          </div>

          {/* Zone Distribution - Compact */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-3">
            <h4 className="font-medium text-green-900 text-sm mb-1.5">Ideal Weekly Distribution</h4>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-800">Zone 1-2</span>
                <div className="flex items-center space-x-1.5">
                  <div className="w-16 h-1.5 bg-green-200 rounded">
                    <div className="w-4/5 h-1.5 bg-green-500 rounded"></div>
                  </div>
                  <span className="text-green-700 font-medium w-8">80%</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-orange-800">Zone 3-4</span>
                <div className="flex items-center space-x-1.5">
                  <div className="w-16 h-1.5 bg-orange-200 rounded">
                    <div className="w-3/12 h-1.5 bg-orange-500 rounded"></div>
                  </div>
                  <span className="text-orange-700 font-medium w-8">15%</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-800">Zone 5</span>
                <div className="flex items-center space-x-1.5">
                  <div className="w-16 h-1.5 bg-red-200 rounded">
                    <div className="w-1/12 h-1.5 bg-red-500 rounded"></div>
                  </div>
                  <span className="text-red-700 font-medium w-8">5%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}