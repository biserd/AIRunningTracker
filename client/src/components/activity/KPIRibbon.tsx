import { MapPin, Clock, TrendingUp, Heart, Mountain, Flame, Zap, Activity } from "lucide-react";

interface KPIRibbonProps {
  distance: string;
  distanceUnit: string;
  duration: string;
  pace: string;
  paceUnit: string;
  avgHR?: number | null;
  elevation?: number | null;
  calories?: number | null;
  power?: number | null;
  cadence?: number | null;
}

export default function KPIRibbon({
  distance,
  distanceUnit,
  duration,
  pace,
  paceUnit,
  avgHR,
  elevation,
  calories,
  power,
  cadence
}: KPIRibbonProps) {
  const metrics = [
    { label: distance, sublabel: distanceUnit, icon: MapPin, color: "text-blue-600" },
    { label: duration, sublabel: "Time", icon: Clock, color: "text-green-600" },
    { label: pace, sublabel: paceUnit, icon: TrendingUp, color: "text-purple-600" },
    avgHR ? { label: `${Math.round(avgHR)}`, sublabel: "bpm", icon: Heart, color: "text-red-600" } : null,
    elevation ? { label: `${Math.round(elevation)}`, sublabel: "m ↑", icon: Mountain, color: "text-orange-600" } : null,
    calories ? { label: `${Math.round(calories)}`, sublabel: "cal", icon: Flame, color: "text-amber-600" } : null,
    power ? { label: `${Math.round(power)}`, sublabel: "W", icon: Zap, color: "text-yellow-600" } : null,
    cadence ? { label: `${Math.round(cadence)}`, sublabel: "spm", icon: Activity, color: "text-indigo-600" } : null,
  ].filter(Boolean) as { label: string; sublabel: string; icon: any; color: string }[];

  return (
    <div 
      className="bg-white rounded-lg shadow-sm px-4 py-3 mb-4 overflow-x-auto" 
      data-testid="kpi-ribbon"
    >
      <div className="flex items-center gap-6 min-w-max">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div 
              key={index} 
              className="flex items-center gap-2"
              data-testid={`kpi-${metric.sublabel.toLowerCase().replace(/[^a-z]/g, '')}`}
            >
              <Icon className={`h-4 w-4 ${metric.color} flex-shrink-0`} />
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-gray-900 text-sm">{metric.label}</span>
                <span className="text-xs text-gray-500">{metric.sublabel}</span>
              </div>
              {index < metrics.length - 1 && (
                <div className="w-px h-4 bg-gray-200 ml-4" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
