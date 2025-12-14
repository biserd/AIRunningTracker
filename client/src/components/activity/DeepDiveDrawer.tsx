import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Timer, Heart, Activity, Mountain } from "lucide-react";

interface DeepDiveDrawerProps {
  onClose: () => void;
  activity: {
    averageCadence?: number;
    maxCadence?: number;
    averageWatts?: number;
    maxWatts?: number;
    averageHeartrate?: number;
    maxHeartrate?: number;
    totalElevationGain?: number;
    elevHigh?: number;
    elevLow?: number;
  };
  streams?: {
    heartrate?: number[];
    cadence?: number[];
    watts?: number[];
    altitude?: number[];
  };
  laps?: Array<{
    name: string;
    distance: number;
    movingTime: number;
    averageSpeed: number;
    averageHeartrate?: number;
    averageCadence?: number;
  }>;
}

function formatPace(speedMps: number): string {
  if (!speedMps || speedMps <= 0) return "--:--";
  const paceSecondsPerKm = 1000 / speedMps;
  const mins = Math.floor(paceSecondsPerKm / 60);
  const secs = Math.round(paceSecondsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function DeepDiveDrawer({ onClose, activity, streams, laps }: DeepDiveDrawerProps) {
  const hrZones = streams?.heartrate ? calculateHRZones(streams.heartrate, activity.maxHeartrate || 190) : null;

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50" data-testid="drawer-deepdive">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Deep Dive</CardTitle>
        <button 
          onClick={onClose} 
          className="p-1 hover:bg-purple-100 rounded-full transition-colors"
          data-testid="button-close-deepdive"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {laps && laps.length > 1 && (
          <div className="bg-white/60 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">Splits</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500">
                    <th className="text-left py-1">Km</th>
                    <th className="text-right py-1">Pace</th>
                    <th className="text-right py-1">Time</th>
                    {laps[0].averageHeartrate && <th className="text-right py-1">HR</th>}
                  </tr>
                </thead>
                <tbody>
                  {laps.slice(0, 10).map((lap, index) => (
                    <tr key={index} className="border-t border-gray-100" data-testid={`split-row-${index}`}>
                      <td className="py-1.5 text-gray-900">{index + 1}</td>
                      <td className="text-right py-1.5 font-medium text-gray-900">
                        {formatPace(lap.averageSpeed)}
                      </td>
                      <td className="text-right py-1.5 text-gray-600">
                        {formatDuration(lap.movingTime)}
                      </td>
                      {lap.averageHeartrate && (
                        <td className="text-right py-1.5 text-gray-600">
                          {Math.round(lap.averageHeartrate)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {laps.length > 10 && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  +{laps.length - 10} more splits
                </p>
              )}
            </div>
          </div>
        )}

        {hrZones && (
          <div className="bg-white/60 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-red-500" />
              <span className="font-medium text-gray-900">HR Zone Distribution</span>
            </div>
            <div className="space-y-2">
              {hrZones.map((zone, index) => (
                <div key={index} className="flex items-center gap-2" data-testid={`hr-zone-${index}`}>
                  <span className="text-xs text-gray-500 w-12">Z{index + 1}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        index === 0 ? 'bg-gray-400' :
                        index === 1 ? 'bg-blue-400' :
                        index === 2 ? 'bg-green-400' :
                        index === 3 ? 'bg-orange-400' :
                        'bg-red-400'
                      }`}
                      style={{ width: `${zone.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 w-10 text-right">{zone.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {activity.averageCadence && (
            <div className="bg-white/60 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium text-gray-900">Cadence</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{Math.round(activity.averageCadence)} spm</p>
              {activity.maxCadence && (
                <p className="text-xs text-gray-500">Max: {Math.round(activity.maxCadence)} spm</p>
              )}
            </div>
          )}

          {activity.averageWatts && (
            <div className="bg-white/60 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-900">Power</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{Math.round(activity.averageWatts)} W</p>
              {activity.maxWatts && (
                <p className="text-xs text-gray-500">Max: {Math.round(activity.maxWatts)} W</p>
              )}
            </div>
          )}

          {activity.totalElevationGain && (
            <div className="bg-white/60 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Mountain className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-900">Elevation</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{Math.round(activity.totalElevationGain)} m</p>
              {activity.elevHigh !== undefined && activity.elevLow !== undefined && (
                <p className="text-xs text-gray-500">
                  {Math.round(activity.elevLow)}m - {Math.round(activity.elevHigh)}m
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function calculateHRZones(heartrate: number[], maxHR: number): Array<{ zone: number; percentage: number }> {
  const validHR = heartrate.filter(h => h > 0);
  if (validHR.length === 0) return [];

  const zones = [0, 0, 0, 0, 0];
  const thresholds = [0.5, 0.6, 0.7, 0.8, 0.9];

  for (const hr of validHR) {
    const pct = hr / maxHR;
    if (pct < thresholds[0]) zones[0]++;
    else if (pct < thresholds[1]) zones[0]++;
    else if (pct < thresholds[2]) zones[1]++;
    else if (pct < thresholds[3]) zones[2]++;
    else if (pct < thresholds[4]) zones[3]++;
    else zones[4]++;
  }

  return zones.map((count, index) => ({
    zone: index + 1,
    percentage: Math.round((count / validHR.length) * 100)
  }));
}
