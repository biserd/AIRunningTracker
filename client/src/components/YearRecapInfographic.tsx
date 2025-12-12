import { useRef, forwardRef, useImperativeHandle } from "react";
import { toPng } from "html-to-image";
import { 
  MapPin, 
  Activity, 
  Clock, 
  TrendingUp,
  Zap,
  Calendar,
  Award,
  Trophy,
  Heart,
  Footprints,
  Flame,
  Target,
  Mountain,
  Navigation
} from "lucide-react";

interface YearlyStats {
  totalRuns: number;
  totalDistanceMiles: number;
  totalDistanceKm: number;
  totalTimeSeconds: number;
  longestRunMiles: number;
  longestRunKm: number;
  fastestPaceMinPerKm: number;
  fastestPaceMinPerMile: number;
  totalElevationFeet: number;
  totalElevationMeters: number;
  mostActiveMonth: string;
  mostActiveMonthRuns: number;
  streakDays: number;
  averageHeartrate: number | null;
  maxHeartrateAchieved: number | null;
  averageCadence: number | null;
  zone2Hours: number | null;
  estimatedVO2Max: number | null;
  trainingDistribution: {
    easy: number;
    moderate: number;
    hard: number;
  };
  mostRunLocation?: {
    name: string;
    runCount: number;
  } | null;
}

interface YearRecapInfographicProps {
  stats: YearlyStats;
  userName: string;
  year: number;
  percentile?: number;
  aiInsights?: string[];
  favoriteDay?: { day: string; count: number };
  unitPreference?: 'km' | 'miles';
}

export interface YearRecapInfographicRef {
  generateImage: () => Promise<string>;
}

function formatPace(minPerKm: number): string {
  if (!minPerKm || minPerKm === Infinity) return "--:--";
  const minutes = Math.floor(minPerKm);
  const seconds = Math.round((minPerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatHours(seconds: number): number {
  return Math.round(seconds / 3600);
}

const YearRecapInfographic = forwardRef<YearRecapInfographicRef, YearRecapInfographicProps>(
  ({ stats, userName, year, percentile = 29, aiInsights = [], favoriteDay, unitPreference = 'km' }, ref) => {
    const infographicRef = useRef<HTMLDivElement>(null);
    const isMetric = unitPreference === 'km';

    useImperativeHandle(ref, () => ({
      generateImage: async () => {
        if (!infographicRef.current) {
          throw new Error("Infographic not ready");
        }
        
        const dataUrl = await toPng(infographicRef.current, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: undefined,
        });
        
        return dataUrl;
      }
    }));

    const hours = formatHours(stats.totalTimeSeconds);
    const fastestPace = formatPace(isMetric ? stats.fastestPaceMinPerKm : stats.fastestPaceMinPerMile);
    const totalDistance = isMetric ? stats.totalDistanceKm : stats.totalDistanceMiles;
    const longestRun = isMetric ? (stats.longestRunKm || stats.longestRunMiles * 1.60934) : stats.longestRunMiles;
    const distanceUnit = isMetric ? 'km' : 'mi';
    const elevationValue = isMetric ? Math.round(stats.totalElevationMeters || stats.totalElevationFeet * 0.3048) : Math.round(stats.totalElevationFeet);
    const elevationUnit = isMetric ? 'm' : 'ft';

    return (
      <div
        ref={infographicRef}
        className="w-[400px] min-h-[800px] p-6 rounded-3xl text-white"
        style={{
          background: "linear-gradient(180deg, #E91E8C 0%, #FF6B35 50%, #FF8E53 100%)",
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        }}
      >
        <div className="text-center mb-6">
          <p className="text-sm font-medium opacity-90 tracking-widest uppercase">
            Your Year in Running
          </p>
          <h1 className="text-5xl font-bold mt-1">{year}</h1>
          <p className="text-xl font-semibold mt-2 opacity-95">{userName}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center">
            <MapPin className="w-5 h-5 mx-auto mb-1 opacity-80" />
            <p className="text-3xl font-bold">{totalDistance.toFixed(1)}</p>
            <p className="text-sm opacity-80">{distanceUnit}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center">
            <Activity className="w-5 h-5 mx-auto mb-1 opacity-80" />
            <p className="text-3xl font-bold">{stats.totalRuns}</p>
            <p className="text-sm opacity-80">runs</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 opacity-80" />
            <p className="text-3xl font-bold">{hours}</p>
            <p className="text-sm opacity-80">hours</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 opacity-80" />
            <p className="text-3xl font-bold">{longestRun.toFixed(1)}</p>
            <p className="text-sm opacity-80">longest {distanceUnit}</p>
          </div>
        </div>

        {elevationValue > 0 && (
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-3">
            <div className="flex items-center gap-3">
              <Mountain className="w-5 h-5 opacity-80" />
              <div>
                <p className="text-xs opacity-70 uppercase tracking-wide">Total Elevation</p>
                <p className="text-xl font-bold">{elevationValue.toLocaleString()} {elevationUnit}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-3">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 opacity-80" />
            <div>
              <p className="text-xs opacity-70 uppercase tracking-wide">Fastest Pace</p>
              <p className="text-xl font-bold">{fastestPace} /{distanceUnit}</p>
            </div>
          </div>
        </div>

        {favoriteDay && (
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 opacity-80" />
                <div>
                  <p className="text-xs opacity-70 uppercase tracking-wide">Favorite Day</p>
                  <p className="text-xl font-bold">{favoriteDay.day}</p>
                </div>
              </div>
              <p className="text-sm opacity-80">{favoriteDay.count} runs</p>
            </div>
          </div>
        )}

        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 opacity-80" />
              <div>
                <p className="text-xs opacity-70 uppercase tracking-wide">Best Month</p>
                <p className="text-xl font-bold">{stats.mostActiveMonth}</p>
              </div>
            </div>
            <p className="text-sm opacity-80">{stats.mostActiveMonthRuns} runs</p>
          </div>
        </div>

        {stats.mostRunLocation && (
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Navigation className="w-5 h-5 opacity-80" />
                <div>
                  <p className="text-xs opacity-70 uppercase tracking-wide">Top Location</p>
                  <p className="text-xl font-bold">{stats.mostRunLocation.name}</p>
                </div>
              </div>
              <p className="text-sm opacity-80">{stats.mostRunLocation.runCount} runs</p>
            </div>
          </div>
        )}

        {stats.estimatedVO2Max || stats.averageCadence || stats.zone2Hours ? (
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 mb-3">
            <p className="text-xs opacity-70 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4" /> Performance Metrics
            </p>
            <div className="grid grid-cols-2 gap-3">
              {stats.estimatedVO2Max && (
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 opacity-70" />
                  <div>
                    <p className="text-lg font-bold">{stats.estimatedVO2Max}</p>
                    <p className="text-xs opacity-70">VO2 Max</p>
                  </div>
                </div>
              )}
              {stats.averageCadence && (
                <div className="flex items-center gap-2">
                  <Footprints className="w-4 h-4 opacity-70" />
                  <div>
                    <p className="text-lg font-bold">{Math.round(stats.averageCadence)}</p>
                    <p className="text-xs opacity-70">Avg Cadence</p>
                  </div>
                </div>
              )}
              {stats.zone2Hours && stats.zone2Hours > 0 && (
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 opacity-70" />
                  <div>
                    <p className="text-lg font-bold">{stats.zone2Hours}h</p>
                    <p className="text-xs opacity-70">Zone 2</p>
                  </div>
                </div>
              )}
              {stats.averageHeartrate && (
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 opacity-70" />
                  <div>
                    <p className="text-lg font-bold">{Math.round(stats.averageHeartrate)}</p>
                    <p className="text-xs opacity-70">Avg HR</p>
                  </div>
                </div>
              )}
            </div>
            {stats.trainingDistribution && (stats.trainingDistribution.easy > 0 || stats.trainingDistribution.moderate > 0 || stats.trainingDistribution.hard > 0) && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <p className="text-xs opacity-70 mb-2">Training Mix</p>
                <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-green-400" 
                    style={{ width: `${stats.trainingDistribution.easy}%` }}
                    title={`Easy: ${stats.trainingDistribution.easy}%`}
                  />
                  <div 
                    className="bg-yellow-400" 
                    style={{ width: `${stats.trainingDistribution.moderate}%` }}
                    title={`Moderate: ${stats.trainingDistribution.moderate}%`}
                  />
                  <div 
                    className="bg-red-400" 
                    style={{ width: `${stats.trainingDistribution.hard}%` }}
                    title={`Hard: ${stats.trainingDistribution.hard}%`}
                  />
                </div>
                <div className="flex justify-between text-xs opacity-70 mt-1">
                  <span>Easy {stats.trainingDistribution.easy}%</span>
                  <span>Mod {stats.trainingDistribution.moderate}%</span>
                  <span>Hard {stats.trainingDistribution.hard}%</span>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="bg-gradient-to-r from-orange-400 to-yellow-400 rounded-2xl p-5 mb-4 text-center">
          <Trophy className="w-8 h-8 mx-auto mb-2" />
          <p className="text-4xl font-bold">{percentile}%</p>
          <p className="text-sm opacity-90">of runners on RunAnalytics</p>
        </div>

        {aiInsights.length > 0 && (
          <div className="mb-4">
            <p className="text-xs opacity-70 uppercase tracking-wide mb-2 flex items-center gap-2">
              ✨ AI Insights
            </p>
            {aiInsights.slice(0, 2).map((insight, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-2">
                <p className="text-sm leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-sm opacity-60 mt-4">aitracker.run</p>
      </div>
    );
  }
);

YearRecapInfographic.displayName = "YearRecapInfographic";

export default YearRecapInfographic;
