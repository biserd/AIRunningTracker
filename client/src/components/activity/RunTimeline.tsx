import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Activity, Heart, TrendingUp, Zap, Mountain, Loader2 } from "lucide-react";
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, ReferenceDot, Line } from 'recharts';

interface AIPin {
  distance: number;
  value: number;
  type: 'drift' | 'slowdown' | 'hr_spike' | 'hill';
  label: string;
  color: string;
}

interface StreamData {
  time?: { data: number[] };
  distance?: { data: number[] };
  velocity_smooth?: { data: number[] };
  heartrate?: { data: number[] };
  watts?: { data: number[] };
  cadence?: { data: number[] };
  altitude?: { data: number[] };
}

interface RunTimelineProps {
  streams?: StreamData | null;
  unitPreference?: string;
  activityDistance?: number;
  isHydrating?: boolean;
}

type MetricType = "pace" | "heartrate" | "power" | "cadence";

const METRIC_COLORS = {
  pace: { stroke: "#8b5cf6", fill: "#8b5cf680" },
  heartrate: { stroke: "#ef4444", fill: "#ef444480" },
  power: { stroke: "#eab308", fill: "#eab30880" },
  cadence: { stroke: "#6366f1", fill: "#6366f180" },
};

export default function RunTimeline({ streams, unitPreference = 'km', activityDistance, isHydrating = false }: RunTimelineProps) {
  const [activeMetrics, setActiveMetrics] = useState<MetricType[]>(["pace"]);
  const [showElevation, setShowElevation] = useState(true);

  const toggleMetric = (metric: MetricType) => {
    setActiveMetrics(prev => {
      if (prev.includes(metric)) {
        if (prev.length === 1) return prev;
        return prev.filter(m => m !== metric);
      }
      return [...prev, metric];
    });
  };

  if (!streams || !streams.distance?.data || !streams.time?.data) {
    return (
      <Card className="mb-6" data-testid="card-run-timeline-empty">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Run Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            {isHydrating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                <p>Fetching detailed data from Strava...</p>
                <p className="text-sm mt-1">This may take a moment.</p>
              </>
            ) : (
              <>
                <p>Detailed stream data not available for this activity.</p>
                <p className="text-sm mt-1">Sync more activities to see timeline charts.</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasHeartrate = streams.heartrate?.data && streams.heartrate.data.length > 0;
  const hasPower = streams.watts?.data && streams.watts.data.length > 0;
  const hasCadence = streams.cadence?.data && streams.cadence.data.length > 0;
  const hasAltitude = streams.altitude?.data && streams.altitude.data.length > 0;
  const hasPace = streams.velocity_smooth?.data && streams.velocity_smooth.data.length > 0;

  const distanceData = streams.distance.data;
  const velocityData = streams.velocity_smooth?.data || [];
  const heartrateData = streams.heartrate?.data || [];
  const powerData = streams.watts?.data || [];
  const cadenceData = streams.cadence?.data || [];
  const altitudeData = streams.altitude?.data || [];

  const isImperial = unitPreference === 'miles';
  const distanceMultiplier = isImperial ? 0.000621371 : 0.001;
  const distanceUnit = isImperial ? 'mi' : 'km';

  const sampleInterval = Math.max(1, Math.floor(distanceData.length / 150));
  
  const chartData = distanceData
    .filter((_, i) => i % sampleInterval === 0)
    .map((dist, sampledIndex) => {
      const i = sampledIndex * sampleInterval;
      const distanceInUnits = dist * distanceMultiplier;
      
      let pace: number | null = null;
      if (velocityData[i] && velocityData[i] > 0) {
        const paceSecondsPerKm = 1000 / velocityData[i];
        pace = isImperial ? paceSecondsPerKm / 0.621371 / 60 : paceSecondsPerKm / 60;
      }

      return {
        distance: distanceInUnits,
        distanceLabel: `${distanceInUnits.toFixed(1)} ${distanceUnit}`,
        pace: pace,
        paceFormatted: pace ? `${Math.floor(pace)}:${String(Math.round((pace % 1) * 60)).padStart(2, '0')}` : null,
        heartrate: heartrateData[i] || null,
        power: powerData[i] || null,
        cadence: cadenceData[i] ? Math.round(cadenceData[i]) : null,
        altitude: altitudeData[i] || null,
      };
    });

  const getMetricConfig = (metric: MetricType) => {
    switch (metric) {
      case "pace":
        return {
          dataKey: "pace",
          stroke: METRIC_COLORS.pace.stroke,
          fill: METRIC_COLORS.pace.fill,
          name: `Pace (/${distanceUnit})`,
          reversed: true,
          formatter: (value: number) => `${Math.floor(value)}:${String(Math.round((value % 1) * 60)).padStart(2, '0')} /${distanceUnit}`,
        };
      case "heartrate":
        return {
          dataKey: "heartrate",
          stroke: METRIC_COLORS.heartrate.stroke,
          fill: METRIC_COLORS.heartrate.fill,
          name: "Heart Rate (bpm)",
          reversed: false,
          formatter: (value: number) => `${Math.round(value)} bpm`,
        };
      case "power":
        return {
          dataKey: "power",
          stroke: METRIC_COLORS.power.stroke,
          fill: METRIC_COLORS.power.fill,
          name: "Power (W)",
          reversed: false,
          formatter: (value: number) => `${Math.round(value)} W`,
        };
      case "cadence":
        return {
          dataKey: "cadence",
          stroke: METRIC_COLORS.cadence.stroke,
          fill: METRIC_COLORS.cadence.fill,
          name: "Cadence (spm)",
          reversed: false,
          formatter: (value: number) => `${Math.round(value)} spm`,
        };
    }
  };

  const primaryMetric = activeMetrics[0];
  const primaryConfig = getMetricConfig(primaryMetric);

  // Detect AI pins for notable events in the run
  const detectAIPins = (): AIPin[] => {
    const pins: AIPin[] = [];
    if (chartData.length < 10) return pins;

    // 1. Biggest Slowdown - find the point with largest pace increase (slower = higher pace value)
    if (hasPace) {
      let maxSlowdown = 0;
      let slowdownIndex = -1;
      for (let i = 5; i < chartData.length - 2; i++) {
        const prevPace = chartData[i - 3]?.pace;
        const currPace = chartData[i]?.pace;
        if (prevPace && currPace && currPace > prevPace) {
          const slowdown = currPace - prevPace;
          if (slowdown > maxSlowdown && slowdown > 0.5) { // At least 30 sec/km slowdown
            maxSlowdown = slowdown;
            slowdownIndex = i;
          }
        }
      }
      if (slowdownIndex > -1 && chartData[slowdownIndex]?.pace) {
        pins.push({
          distance: chartData[slowdownIndex].distance,
          value: chartData[slowdownIndex].pace!,
          type: 'slowdown',
          label: 'Biggest slowdown',
          color: '#ef4444' // red
        });
      }
    }

    // 2. HR Spike - sudden heart rate increase
    if (hasHeartrate) {
      let maxSpike = 0;
      let spikeIndex = -1;
      for (let i = 3; i < chartData.length - 2; i++) {
        const prevHR = chartData[i - 2]?.heartrate;
        const currHR = chartData[i]?.heartrate;
        if (prevHR && currHR && currHR > prevHR) {
          const spike = currHR - prevHR;
          if (spike > maxSpike && spike > 10) { // At least 10bpm spike
            maxSpike = spike;
            spikeIndex = i;
          }
        }
      }
      if (spikeIndex > -1 && chartData[spikeIndex]?.heartrate) {
        pins.push({
          distance: chartData[spikeIndex].distance,
          value: chartData[spikeIndex].heartrate!,
          type: 'hr_spike',
          label: `HR spike (+${Math.round(maxSpike)}bpm)`,
          color: '#f97316' // orange
        });
      }
    }

    // 3. Cardiac Drift Onset - where pace/HR ratio starts deteriorating
    if (hasPace && hasHeartrate) {
      // Look for where HR increases while pace stays same or slows
      let driftIndex = -1;
      const windowSize = 5;
      for (let i = Math.floor(chartData.length * 0.3); i < chartData.length - windowSize; i++) {
        const earlyPace = chartData.slice(i - windowSize, i).filter(d => d.pace).map(d => d.pace!);
        const earlyHR = chartData.slice(i - windowSize, i).filter(d => d.heartrate).map(d => d.heartrate!);
        const laterPace = chartData.slice(i, i + windowSize).filter(d => d.pace).map(d => d.pace!);
        const laterHR = chartData.slice(i, i + windowSize).filter(d => d.heartrate).map(d => d.heartrate!);
        
        if (earlyPace.length > 0 && laterPace.length > 0 && earlyHR.length > 0 && laterHR.length > 0) {
          const avgEarlyPace = earlyPace.reduce((a, b) => a + b, 0) / earlyPace.length;
          const avgLaterPace = laterPace.reduce((a, b) => a + b, 0) / laterPace.length;
          const avgEarlyHR = earlyHR.reduce((a, b) => a + b, 0) / earlyHR.length;
          const avgLaterHR = laterHR.reduce((a, b) => a + b, 0) / laterHR.length;
          
          // Drift = HR going up while pace stays similar or gets worse
          const hrIncrease = avgLaterHR - avgEarlyHR;
          const paceSlowdown = avgLaterPace - avgEarlyPace;
          
          if (hrIncrease > 5 && paceSlowdown >= -0.1) { // HR up 5bpm+, pace not improving
            driftIndex = i;
            break;
          }
        }
      }
      if (driftIndex > -1 && chartData[driftIndex]?.pace) {
        pins.push({
          distance: chartData[driftIndex].distance,
          value: chartData[driftIndex].pace!,
          type: 'drift',
          label: 'Cardiac drift onset',
          color: '#a855f7' // purple
        });
      }
    }

    // 4. Hill Impact - where elevation gain correlates with pace drop
    if (hasAltitude && hasPace) {
      let maxHillImpact = 0;
      let hillIndex = -1;
      for (let i = 3; i < chartData.length - 2; i++) {
        const prevAlt = chartData[i - 2]?.altitude;
        const currAlt = chartData[i]?.altitude;
        const prevPace = chartData[i - 2]?.pace;
        const currPace = chartData[i]?.pace;
        
        if (prevAlt && currAlt && prevPace && currPace) {
          const elevGain = currAlt - prevAlt;
          const paceSlowdown = currPace - prevPace;
          
          // Significant uphill (>5m) causing pace drop
          if (elevGain > 5 && paceSlowdown > 0.3) {
            const impact = elevGain * paceSlowdown;
            if (impact > maxHillImpact) {
              maxHillImpact = impact;
              hillIndex = i;
            }
          }
        }
      }
      if (hillIndex > -1 && chartData[hillIndex]?.pace) {
        pins.push({
          distance: chartData[hillIndex].distance,
          value: chartData[hillIndex].pace!,
          type: 'hill',
          label: 'Hill impact',
          color: '#22c55e' // green
        });
      }
    }

    return pins;
  };

  const aiPins = detectAIPins();

  const minAltitude = hasAltitude ? Math.min(...altitudeData.filter(a => a != null)) : 0;
  const maxAltitude = hasAltitude ? Math.max(...altitudeData.filter(a => a != null)) : 100;

  return (
    <Card className="mb-6" data-testid="card-run-timeline">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Run Timeline
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex gap-1" data-testid="toggle-timeline-metric">
              {hasPace && (
                <button 
                  onClick={() => toggleMetric("pace")}
                  className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                    activeMetrics.includes("pace") 
                      ? "bg-purple-100 text-purple-700 border border-purple-300" 
                      : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                  }`}
                  data-testid="toggle-pace"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  Pace
                </button>
              )}
              {hasHeartrate && (
                <button 
                  onClick={() => toggleMetric("heartrate")}
                  className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                    activeMetrics.includes("heartrate") 
                      ? "bg-red-100 text-red-700 border border-red-300" 
                      : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                  }`}
                  data-testid="toggle-hr"
                >
                  <Heart className="h-3.5 w-3.5" />
                  HR
                </button>
              )}
              {hasPower && (
                <button 
                  onClick={() => toggleMetric("power")}
                  className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                    activeMetrics.includes("power") 
                      ? "bg-yellow-100 text-yellow-700 border border-yellow-300" 
                      : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                  }`}
                  data-testid="toggle-power"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Power
                </button>
              )}
              {hasCadence && (
                <button 
                  onClick={() => toggleMetric("cadence")}
                  className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                    activeMetrics.includes("cadence") 
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-300" 
                      : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                  }`}
                  data-testid="toggle-cadence"
                >
                  <Activity className="h-3.5 w-3.5" />
                  Cadence
                </button>
              )}
            </div>
            {hasAltitude && (
              <div className="flex items-center gap-2">
                <Switch
                  id="elevation-toggle"
                  checked={showElevation}
                  onCheckedChange={setShowElevation}
                  data-testid="switch-elevation"
                />
                <Label htmlFor="elevation-toggle" className="text-xs text-gray-500 flex items-center gap-1">
                  <Mountain className="h-3.5 w-3.5" />
                  Elevation
                </Label>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64" data-testid="timeline-chart">
          <ResponsiveContainer width="100%" height="100%" data-testid="timeline-responsive-container">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="distance" 
                tickFormatter={(val) => `${val.toFixed(1)}`}
                label={{ value: distanceUnit, position: 'insideBottomRight', offset: -5, fontSize: 11 }}
                fontSize={11}
              />
              <YAxis 
                yAxisId="main"
                domain={['auto', 'auto']}
                reversed={primaryConfig.reversed}
                tickFormatter={(val) => primaryMetric === 'pace' ? `${Math.floor(val)}:${String(Math.round((val % 1) * 60)).padStart(2, '0')}` : String(Math.round(val))}
                fontSize={11}
                width={45}
              />
              {activeMetrics.length > 1 && (
                <YAxis 
                  yAxisId="secondary"
                  orientation="right"
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => String(Math.round(val))}
                  fontSize={10}
                  width={40}
                  stroke="#94a3b8"
                />
              )}
              {showElevation && hasAltitude && (
                <YAxis 
                  yAxisId="elevation"
                  orientation="right"
                  domain={[minAltitude - 10, maxAltitude + 10]}
                  tickFormatter={(val) => `${Math.round(val)}m`}
                  fontSize={10}
                  width={40}
                  stroke="#94a3b8"
                />
              )}
              <Tooltip 
                formatter={(value: number, name: string) => {
                  for (const metric of activeMetrics) {
                    const config = getMetricConfig(metric);
                    if (name === config.name) return config.formatter(value);
                  }
                  if (name === 'Elevation') return `${Math.round(value)}m`;
                  return value;
                }}
                labelFormatter={(label) => `${Number(label).toFixed(2)} ${distanceUnit}`}
              />
              {showElevation && hasAltitude && (
                <Area
                  yAxisId="elevation"
                  type="monotone"
                  dataKey="altitude"
                  stroke="#94a3b8"
                  fill="#e2e8f0"
                  fillOpacity={0.4}
                  name="Elevation"
                />
              )}
              {activeMetrics.map((metric, idx) => {
                const config = getMetricConfig(metric);
                return (
                  <Line
                    key={metric}
                    yAxisId={idx === 0 ? "main" : "secondary"}
                    type="monotone"
                    dataKey={config.dataKey}
                    stroke={config.stroke}
                    strokeWidth={2}
                    dot={false}
                    name={config.name}
                  />
                );
              })}
              {/* AI Pins - show relevant pins based on active metrics */}
              {aiPins
                .filter(pin => {
                  // Show pace-related pins if pace is active
                  if (activeMetrics.includes('pace') && (pin.type === 'slowdown' || pin.type === 'drift' || pin.type === 'hill')) {
                    return true;
                  }
                  // Show HR spike if HR is active
                  if (activeMetrics.includes('heartrate') && pin.type === 'hr_spike') {
                    return true;
                  }
                  return false;
                })
                .map((pin, idx) => {
                  // Get the correct Y value based on primary metric
                  const dataPoint = chartData.find(d => Math.abs(d.distance - pin.distance) < 0.1);
                  let yValue = pin.value;
                  if (primaryMetric === 'heartrate' && dataPoint?.heartrate) {
                    yValue = dataPoint.heartrate;
                  } else if (primaryMetric === 'pace' && dataPoint?.pace) {
                    yValue = dataPoint.pace;
                  }
                  
                  return (
                    <ReferenceDot
                      key={`pin-${idx}`}
                      x={pin.distance}
                      y={yValue}
                      yAxisId="main"
                      r={6}
                      fill={pin.color}
                      stroke="#fff"
                      strokeWidth={2}
                      data-testid={`ai-pin-${pin.type}`}
                    />
                  );
                })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {/* AI Pins Legend */}
        {aiPins.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800" data-testid="ai-pins-legend">
            <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">AI Insights:</span>
              {aiPins.map((pin, idx) => (
                <div key={`legend-${idx}`} className="flex items-center gap-1.5" data-testid={`legend-${pin.type}`}>
                  <span 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: pin.color }}
                  />
                  <span>{pin.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
