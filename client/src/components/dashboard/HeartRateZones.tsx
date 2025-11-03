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
      <CardHeader>
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
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Settings Panel */}
          {showSettings && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-charcoal">Customize Your Heart Rate</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxHR">Max Heart Rate</Label>
                  <Input
                    id="maxHR"
                    type="number"
                    placeholder="190"
                    value={maxHR}
                    onChange={(e) => setMaxHR(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="restingHR">Resting Heart Rate</Label>
                  <Input
                    id="restingHR"
                    type="number"
                    placeholder="60"
                    value={restingHR}
                    onChange={(e) => setRestingHR(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleUpdateZones} size="sm">
                Update Zones
              </Button>
            </div>
          )}

          {/* Heart Rate Zones Display */}
          <div className="space-y-3">
            {Object.entries(heartRateZones).map(([zoneKey, zone]) => {
              const zoneData = zone as HeartRateZone;
              return (
              <div 
                key={zoneKey}
                className={`border rounded-lg p-4 ${zoneColors[zoneKey as keyof typeof zoneColors]}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-white/80">
                      Zone {zoneKey.slice(-1)}
                    </Badge>
                    <span className="font-semibold">{zoneData.name}</span>
                  </div>
                  <span className="font-bold text-lg">
                    {zoneData.min} - {zoneData.max} bpm
                  </span>
                </div>
                <p className="text-sm opacity-90">{zoneData.description}</p>
              </div>
              );
            })}
          </div>

          {/* Training Guidelines */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Info className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium text-blue-900">Training Guidelines</h4>
            </div>
            <div className="space-y-2 text-sm text-blue-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <strong>Zone 1-2 (80% of training):</strong>
                  <p>Build aerobic base, improve fat burning</p>
                </div>
                <div>
                  <strong>Zone 3-4 (15% of training):</strong>
                  <p>Improve lactate threshold, race pace</p>
                </div>
                <div>
                  <strong>Zone 5 (5% of training):</strong>
                  <p>Develop VO2 max, neuromuscular power</p>
                </div>
                <div>
                  <strong>Recovery:</strong>
                  <p>Stay in Zone 1 for easy days</p>
                </div>
              </div>
            </div>
          </div>

          {/* Zone Distribution Recommendation */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">Ideal Weekly Distribution</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-800">Zone 1-2 (Easy/Aerobic)</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-green-200 rounded">
                    <div className="w-4/5 h-2 bg-green-500 rounded"></div>
                  </div>
                  <span className="text-green-700 font-medium">80%</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-orange-800">Zone 3-4 (Moderate/Hard)</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-orange-200 rounded">
                    <div className="w-3/12 h-2 bg-orange-500 rounded"></div>
                  </div>
                  <span className="text-orange-700 font-medium">15%</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-800">Zone 5 (Very Hard)</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-red-200 rounded">
                    <div className="w-1/12 h-2 bg-red-500 rounded"></div>
                  </div>
                  <span className="text-red-700 font-medium">5%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}