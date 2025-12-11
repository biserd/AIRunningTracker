import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Calendar, 
  MapPin, 
  Timer, 
  TrendingUp, 
  Mountain, 
  Flame, 
  Activity, 
  Download, 
  Share2, 
  Sparkles,
  Trophy,
  Zap
} from "lucide-react";
import { Helmet } from "react-helmet";

interface YearlyStats {
  totalRuns: number;
  totalDistanceMeters: number;
  totalDistanceMiles: number;
  totalDistanceKm: number;
  totalTimeSeconds: number;
  totalElevationMeters: number;
  totalElevationFeet: number;
  longestRunMeters: number;
  longestRunMiles: number;
  fastestPaceMinPerMile: number;
  fastestPaceMinPerKm: number;
  averagePaceMinPerMile: number;
  averagePaceMinPerKm: number;
  totalCalories: number;
  averageHeartrate: number | null;
  mostActiveMonth: string;
  mostActiveMonthRuns: number;
  streakDays: number;
  mostRunLocation: {
    name: string;
    latitude: number;
    longitude: number;
    runCount: number;
    description: string;
  } | null;
}

export default function YearRecapPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const availableYears = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<YearlyStats>({
    queryKey: ['/api/year-recap', user?.id, 'stats', selectedYear],
    queryFn: async () => {
      const response = await fetch(`/api/year-recap/${user?.id}/stats?year=${selectedYear}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: !!user?.id,
  });

  const generateImageMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        `/api/year-recap/${user?.id}/generate-image`,
        'POST',
        { year: parseInt(selectedYear) }
      );
      return response;
    },
    onSuccess: (data: any) => {
      setGeneratedImage(data.image);
      toast({
        title: "Image Generated!",
        description: "Your Year in Running infographic is ready to download and share.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate infographic. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setGeneratedImage(null);
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `RunAnalytics-${selectedYear}-Recap.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (!generatedImage) return;

    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const file = new File([blob], `RunAnalytics-${selectedYear}-Recap.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `My ${selectedYear} Running Year`,
          text: `Check out my ${selectedYear} running stats!`,
          files: [file],
        });
      } else {
        await navigator.clipboard.writeText(`Check out my ${selectedYear} Running Year with RunAnalytics!`);
        toast({
          title: "Link Copied!",
          description: "Share message copied to clipboard.",
        });
      }
    } catch (error) {
      console.error('Share error:', error);
      toast({
        title: "Share Failed",
        description: "Please download and share manually.",
        variant: "destructive",
      });
    }
  };

  const formatPace = (pace: number) => {
    const mins = Math.floor(pace);
    const secs = Math.round((pace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (authLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Please log in to view your Year in Running</h1>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Year in Running {selectedYear} | RunAnalytics</title>
        <meta name="description" content={`View your personalized ${selectedYear} running statistics and generate a beautiful infographic to share.`} />
      </Helmet>

      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
              Your {selectedYear} Running Year
            </h1>
            <p className="text-muted-foreground mt-1">
              Review your running achievements and create a shareable infographic
            </p>
          </div>
          
          <Select value={selectedYear} onValueChange={handleYearChange}>
            <SelectTrigger className="w-32" data-testid="select-year">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : stats && stats.totalRuns > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Activity className="h-8 w-8 text-orange-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Runs</p>
                      <p className="text-2xl font-bold" data-testid="text-total-runs">{stats.totalRuns}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Distance</p>
                      <p className="text-2xl font-bold" data-testid="text-total-distance">
                        {stats.totalDistanceMiles.toFixed(1)} mi
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Timer className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Time</p>
                      <p className="text-2xl font-bold" data-testid="text-total-time">
                        {formatTime(stats.totalTimeSeconds)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Mountain className="h-8 w-8 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Elevation</p>
                      <p className="text-2xl font-bold" data-testid="text-elevation">
                        {stats.totalElevationFeet.toFixed(0)} ft
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Zap className="h-8 w-8 text-yellow-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Fastest Pace</p>
                      <p className="text-2xl font-bold" data-testid="text-fastest-pace">
                        {formatPace(stats.fastestPaceMinPerMile)} /mi
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-8 w-8 text-pink-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Longest Run</p>
                      <p className="text-2xl font-bold" data-testid="text-longest-run">
                        {stats.longestRunMiles.toFixed(1)} mi
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Flame className="h-8 w-8 text-red-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Calories</p>
                      <p className="text-2xl font-bold" data-testid="text-calories">
                        {stats.totalCalories.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-cyan-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Best Month</p>
                      <p className="text-2xl font-bold" data-testid="text-best-month">
                        {stats.mostActiveMonth}
                      </p>
                      <p className="text-xs text-muted-foreground">{stats.mostActiveMonthRuns} runs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {stats.mostRunLocation && (
                <Card className="bg-gradient-to-br from-teal-500/10 to-teal-600/5 border-teal-500/20 col-span-2 md:col-span-1">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-8 w-8 text-teal-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Favorite Spot</p>
                        <p className="text-lg font-bold" data-testid="text-favorite-location">
                          {stats.mostRunLocation.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{stats.mostRunLocation.runCount} runs</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {stats.streakDays > 1 && (
                <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-8 w-8 text-amber-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Longest Streak</p>
                        <p className="text-2xl font-bold" data-testid="text-streak">
                          {stats.streakDays} days
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Generate Your Infographic
                </CardTitle>
                <CardDescription>
                  Create a beautiful, personalized infographic themed around your most-run location
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!generatedImage ? (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <div className="text-center max-w-md">
                      <p className="text-muted-foreground mb-4">
                        Generate a stunning infographic featuring your {selectedYear} running stats. 
                        Perfect for sharing on social media!
                      </p>
                    </div>
                    <Button 
                      size="lg"
                      onClick={() => generateImageMutation.mutate()}
                      disabled={generateImageMutation.isPending}
                      className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                      data-testid="button-generate-image"
                    >
                      {generateImageMutation.isPending ? (
                        <>
                          <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Infographic
                        </>
                      )}
                    </Button>
                    {generateImageMutation.isPending && (
                      <p className="text-sm text-muted-foreground">
                        This may take 30-60 seconds...
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="max-w-md mx-auto border rounded-lg overflow-hidden shadow-lg">
                      <img 
                        src={generatedImage} 
                        alt={`${selectedYear} Running Year Infographic`}
                        className="w-full h-auto"
                        data-testid="img-generated-infographic"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        onClick={handleDownload}
                        variant="outline"
                        data-testid="button-download"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                      <Button 
                        onClick={handleShare}
                        className="bg-gradient-to-r from-orange-500 to-purple-600"
                        data-testid="button-share"
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => generateImageMutation.mutate()}
                        disabled={generateImageMutation.isPending}
                        data-testid="button-regenerate"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Regenerate
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Activity className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Running Data for {selectedYear}</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                We couldn't find any running activities for this year. Connect your Strava account and sync your activities to see your Year in Running.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
