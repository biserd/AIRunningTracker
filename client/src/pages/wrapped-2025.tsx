import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { toPng } from "html-to-image";
import { 
  Download, 
  Share2, 
  Trophy, 
  Calendar, 
  Clock, 
  Flame,
  MapPin,
  TrendingUp,
  ArrowLeft,
  Loader2,
  Footprints,
  Zap,
  Brain,
  Sparkles
} from "lucide-react";

interface AIInsight {
  type: string;
  title: string;
  content: string;
}

interface WrappedStats {
  hasData: boolean;
  message?: string;
  stats?: {
    totalRuns: number;
    totalDistance: number;
    totalDistanceUnit: string;
    totalHours: number;
    longestRun: {
      distance: number;
      name: string;
      date: string;
    };
    fastestPace: {
      paceMinutes: number;
      paceSeconds: number;
      activityName: string;
      date: string;
    } | null;
    mostActiveMonth: {
      name: string;
      runCount: number;
    };
    favoriteDay: {
      name: string;
      runCount: number;
    };
    avgDistancePerRun: number;
    totalElevationGain: number;
    elevationUnit: string;
    percentile: number;
    unitPreference: string;
  };
  userName: string;
  aiInsights?: AIInsight[];
}

export default function Wrapped2025Page() {
  const [isSaving, setIsSaving] = useState(false);
  const infographicRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<WrappedStats>({
    queryKey: ['/api/wrapped/2025'],
  });

  const handleDownload = async () => {
    if (!infographicRef.current) return;
    
    setIsSaving(true);
    try {
      const dataUrl = await toPng(infographicRef.current, {
        quality: 1,
        pixelRatio: 2,
      });
      
      const link = document.createElement('a');
      link.download = `runanalytics-wrapped-2025.png`;
      link.href = dataUrl;
      link.click();
      
      toast({
        title: "Image saved!",
        description: "Your Running Wrapped has been downloaded.",
      });
    } catch (err) {
      console.error('Failed to save image:', err);
      toast({
        title: "Failed to save",
        description: "There was an error saving the image.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!infographicRef.current) return;
    
    setIsSaving(true);
    try {
      const dataUrl = await toPng(infographicRef.current, {
        quality: 1,
        pixelRatio: 2,
      });
      
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'runanalytics-wrapped-2025.png', { type: 'image/png' });
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My 2025 Running Wrapped',
          text: 'Check out my 2025 running year in review from RunAnalytics!',
        });
      } else {
        // Fallback to download without calling handleDownload to avoid double isSaving toggle
        const link = document.createElement('a');
        link.download = `runanalytics-wrapped-2025.png`;
        link.href = dataUrl;
        link.click();
        
        toast({
          title: "Image saved!",
          description: "Your Running Wrapped has been downloaded.",
        });
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Failed to share:', err);
        toast({
          title: "Sharing not available",
          description: "Try using the Download button instead.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-orange-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading your 2025 Running Wrapped...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <Card className="bg-gray-800/50 border-gray-700 p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">Oops!</h2>
          <p className="text-gray-300 mb-6">We couldn't load your 2025 Running Wrapped. Please try again later.</p>
          <Link href="/dashboard">
            <Button className="bg-orange-500 hover:bg-orange-600">Back to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!data.hasData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <Card className="bg-gray-800/50 border-gray-700 p-8 text-center max-w-md">
          <Trophy className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Not Enough Data Yet</h2>
          <p className="text-gray-300 mb-6">{data.message || "Keep running and sync your activities to see your 2025 Wrapped!"}</p>
          <Link href="/dashboard">
            <Button className="bg-orange-500 hover:bg-orange-600">Back to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const stats = data.stats!;
  const userName = data.userName;

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-gray-900 overflow-hidden">
      <SEO 
        title="2025 Running Wrapped | RunAnalytics"
        description={`${userName}'s 2025 running year in review - ${stats.totalDistance} ${stats.totalDistanceUnit}, ${stats.totalRuns} runs, and more!`}
      />
      
      {/* Back Button */}
      <div className="fixed top-4 left-4 z-50">
        <Link href="/dashboard">
          <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Dashboard
          </Button>
        </Link>
      </div>

      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
        {/* Infographic Container */}
        <div 
          ref={infographicRef}
          className="w-full max-w-md bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 rounded-3xl p-6 shadow-2xl"
          data-testid="wrapped-infographic"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <p className="text-white/80 text-sm font-medium uppercase tracking-wider">Your Year in Running</p>
            <h1 className="text-4xl font-black text-white mt-1">2025</h1>
            <p className="text-white/90 text-lg font-semibold mt-2">{userName}</p>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Total Distance */}
            <div className="bg-white/15 backdrop-blur rounded-xl p-4 text-center">
              <MapPin className="h-6 w-6 text-white/80 mx-auto mb-2" />
              <div className="text-3xl font-black text-white">{stats.totalDistance}</div>
              <div className="text-white/70 text-sm">{stats.totalDistanceUnit}</div>
            </div>

            {/* Total Runs */}
            <div className="bg-white/15 backdrop-blur rounded-xl p-4 text-center">
              <Footprints className="h-6 w-6 text-white/80 mx-auto mb-2" />
              <div className="text-3xl font-black text-white">{stats.totalRuns}</div>
              <div className="text-white/70 text-sm">runs</div>
            </div>

            {/* Total Time */}
            <div className="bg-white/15 backdrop-blur rounded-xl p-4 text-center">
              <Clock className="h-6 w-6 text-white/80 mx-auto mb-2" />
              <div className="text-3xl font-black text-white">{Math.round(stats.totalHours)}</div>
              <div className="text-white/70 text-sm">hours</div>
            </div>

            {/* Longest Run */}
            <div className="bg-white/15 backdrop-blur rounded-xl p-4 text-center">
              <TrendingUp className="h-6 w-6 text-white/80 mx-auto mb-2" />
              <div className="text-3xl font-black text-white">{stats.longestRun.distance}</div>
              <div className="text-white/70 text-sm">longest {stats.totalDistanceUnit}</div>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="space-y-3 mb-4">
            {/* Fastest Pace */}
            {stats.fastestPace && (
              <div className="bg-white/10 backdrop-blur rounded-xl p-3 flex items-center gap-3">
                <div className="bg-white/20 rounded-full p-2">
                  <Zap className="h-5 w-5 text-yellow-300" />
                </div>
                <div className="flex-1">
                  <div className="text-white/70 text-xs uppercase tracking-wide">Fastest Pace</div>
                  <div className="text-white font-bold text-lg">
                    {stats.fastestPace.paceMinutes}:{stats.fastestPace.paceSeconds.toString().padStart(2, '0')} /{stats.unitPreference === 'imperial' ? 'mi' : 'km'}
                  </div>
                </div>
              </div>
            )}

            {/* Favorite Day */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <Calendar className="h-5 w-5 text-blue-300" />
              </div>
              <div className="flex-1">
                <div className="text-white/70 text-xs uppercase tracking-wide">Favorite Day</div>
                <div className="text-white font-bold text-lg">{stats.favoriteDay.name}s</div>
              </div>
              <div className="text-white/60 text-sm">{stats.favoriteDay.runCount} runs</div>
            </div>

            {/* Most Active Month */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <Flame className="h-5 w-5 text-orange-300" />
              </div>
              <div className="flex-1">
                <div className="text-white/70 text-xs uppercase tracking-wide">Best Month</div>
                <div className="text-white font-bold text-lg">{stats.mostActiveMonth.name}</div>
              </div>
              <div className="text-white/60 text-sm">{stats.mostActiveMonth.runCount} runs</div>
            </div>
          </div>

          {/* Percentile Badge */}
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-4 text-center mb-4">
            <Trophy className="h-8 w-8 text-white mx-auto mb-2" />
            <div className="text-white font-bold text-sm uppercase tracking-wide">You beat</div>
            <div className="text-4xl font-black text-white">{stats.percentile}%</div>
            <div className="text-white/90 text-sm">of runners on RunAnalytics</div>
          </div>

          {/* AI Insights */}
          {data.aiInsights && data.aiInsights.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-yellow-300" />
                <span className="text-white/80 text-xs uppercase tracking-wide font-medium">AI Insights</span>
              </div>
              <div className="space-y-2">
                {data.aiInsights.map((insight, index) => (
                  <div key={index} className="bg-white/10 backdrop-blur rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Brain className="h-4 w-4 text-cyan-300 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-white font-semibold text-sm">{insight.title}</div>
                        <div className="text-white/70 text-xs mt-1">{insight.content}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Branding */}
          <div className="text-center">
            <p className="text-white/60 text-xs">runanalytics.io</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <Button 
            onClick={handleShare}
            disabled={isSaving}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3"
            data-testid="wrapped-share-button"
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Share2 className="h-5 w-5 mr-2" />
            )}
            {isSaving ? 'Saving...' : 'Share'}
          </Button>
          <Button 
            onClick={handleDownload}
            disabled={isSaving}
            className="bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-3"
            data-testid="wrapped-download-button"
          >
            <Download className="h-5 w-5 mr-2" />
            Download
          </Button>
        </div>

        {/* Back to Dashboard Link */}
        <Link href="/dashboard" className="mt-4">
          <Button 
            variant="ghost" 
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
