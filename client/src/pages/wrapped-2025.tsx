import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Share2, 
  Trophy, 
  Calendar, 
  Clock, 
  Flame,
  Mountain,
  Zap,
  MapPin,
  TrendingUp,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WrappedStats {
  hasData: boolean;
  message?: string;
  year: number;
  stats: {
    totalDistance: number;
    totalDistanceUnit: string;
    totalHours: number;
    totalRuns: number;
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
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 300 : -300,
    opacity: 0
  })
};

export default function Wrapped2025Page() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery<WrappedStats>({
    queryKey: ['/api/wrapped/2025'],
  });

  const nextSlide = () => {
    if (data?.hasData) {
      setDirection(1);
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }
  };

  const prevSlide = () => {
    if (data?.hasData) {
      setDirection(-1);
      setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
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
          <h2 className="text-2xl font-bold text-white mb-4">Unable to load Wrapped</h2>
          <p className="text-gray-400 mb-6">Please make sure you're logged in and have synced your Strava activities.</p>
          <Link href="/dashboard">
            <Button className="bg-orange-500 hover:bg-orange-600">
              Go to Dashboard
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!data.hasData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <SEO 
          title="2025 Running Wrapped | RunAnalytics"
          description="View your personalized 2025 running year in review"
        />
        <Card className="bg-gray-800/50 border-gray-700 p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">No 2025 Data Yet</h2>
          <p className="text-gray-400 mb-6">{data.message || "Start logging runs in 2025 to see your year in review!"}</p>
          <Link href="/dashboard">
            <Button className="bg-orange-500 hover:bg-orange-600">
              Go to Dashboard
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const { stats, userName } = data;

  const slides = [
    {
      id: "intro",
      gradient: "from-orange-600 via-red-500 to-pink-500",
      content: (
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-black text-white">
            {userName}'s
          </h1>
          <h2 className="text-5xl md:text-7xl font-black text-white">
            2025
          </h2>
          <p className="text-2xl md:text-3xl text-white/90 font-semibold">
            Running Wrapped
          </p>
          <div className="pt-8">
            <p className="text-white/70 text-lg">Swipe to see your year →</p>
          </div>
        </div>
      )
    },
    {
      id: "total-distance",
      gradient: "from-blue-600 via-cyan-500 to-teal-500",
      content: (
        <div className="text-center space-y-6">
          <MapPin className="h-16 w-16 text-white/80 mx-auto" />
          <p className="text-xl text-white/80">You ran a total of</p>
          <div className="text-6xl md:text-8xl font-black text-white">
            <AnimatedCounter end={stats.totalDistance} className="text-white" />
          </div>
          <p className="text-3xl text-white/90 font-bold">{stats.totalDistanceUnit}</p>
          <p className="text-lg text-white/70">in 2025</p>
        </div>
      )
    },
    {
      id: "total-runs",
      gradient: "from-purple-600 via-violet-500 to-indigo-500",
      content: (
        <div className="text-center space-y-6">
          <Flame className="h-16 w-16 text-white/80 mx-auto" />
          <p className="text-xl text-white/80">You completed</p>
          <div className="text-6xl md:text-8xl font-black text-white">
            <AnimatedCounter end={stats.totalRuns} className="text-white" />
          </div>
          <p className="text-3xl text-white/90 font-bold">runs</p>
          <p className="text-lg text-white/70">
            Averaging {stats.avgDistancePerRun} {stats.totalDistanceUnit} per run
          </p>
        </div>
      )
    },
    {
      id: "time",
      gradient: "from-emerald-600 via-green-500 to-lime-500",
      content: (
        <div className="text-center space-y-6">
          <Clock className="h-16 w-16 text-white/80 mx-auto" />
          <p className="text-xl text-white/80">You spent</p>
          <div className="text-6xl md:text-8xl font-black text-white">
            <AnimatedCounter end={stats.totalHours} className="text-white" />
          </div>
          <p className="text-3xl text-white/90 font-bold">hours</p>
          <p className="text-lg text-white/70">running this year</p>
        </div>
      )
    },
    {
      id: "longest-run",
      gradient: "from-amber-600 via-orange-500 to-yellow-500",
      content: (
        <div className="text-center space-y-6">
          <Trophy className="h-16 w-16 text-white/80 mx-auto" />
          <p className="text-xl text-white/80">Your longest run was</p>
          <div className="text-6xl md:text-8xl font-black text-white">
            {stats.longestRun.distance}
          </div>
          <p className="text-3xl text-white/90 font-bold">{stats.totalDistanceUnit}</p>
          <p className="text-lg text-white/70 max-w-xs mx-auto truncate">
            "{stats.longestRun.name}"
          </p>
        </div>
      )
    },
    ...(stats.fastestPace ? [{
      id: "fastest-pace",
      gradient: "from-rose-600 via-red-500 to-orange-500",
      content: (
        <div className="text-center space-y-6">
          <Zap className="h-16 w-16 text-white/80 mx-auto" />
          <p className="text-xl text-white/80">Your fastest pace was</p>
          <div className="text-6xl md:text-8xl font-black text-white">
            {stats.fastestPace!.paceMinutes}:{String(stats.fastestPace!.paceSeconds).padStart(2, '0')}
          </div>
          <p className="text-3xl text-white/90 font-bold">/{stats.totalDistanceUnit === 'mi' ? 'mi' : 'km'}</p>
          <p className="text-lg text-white/70">🔥 Speed demon!</p>
        </div>
      )
    }] : []),
    {
      id: "elevation",
      gradient: "from-slate-600 via-gray-500 to-zinc-500",
      content: (
        <div className="text-center space-y-6">
          <Mountain className="h-16 w-16 text-white/80 mx-auto" />
          <p className="text-xl text-white/80">You climbed</p>
          <div className="text-6xl md:text-8xl font-black text-white">
            <AnimatedCounter end={stats.totalElevationGain} className="text-white" />
          </div>
          <p className="text-3xl text-white/90 font-bold">{stats.elevationUnit}</p>
          <p className="text-lg text-white/70">of elevation gain</p>
        </div>
      )
    },
    {
      id: "favorite-day",
      gradient: "from-pink-600 via-fuchsia-500 to-purple-500",
      content: (
        <div className="text-center space-y-6">
          <Calendar className="h-16 w-16 text-white/80 mx-auto" />
          <p className="text-xl text-white/80">Your favorite day to run was</p>
          <div className="text-5xl md:text-7xl font-black text-white">
            {stats.favoriteDay.name}
          </div>
          <p className="text-lg text-white/70">
            with {stats.favoriteDay.runCount} runs
          </p>
        </div>
      )
    },
    {
      id: "most-active-month",
      gradient: "from-cyan-600 via-blue-500 to-indigo-500",
      content: (
        <div className="text-center space-y-6">
          <TrendingUp className="h-16 w-16 text-white/80 mx-auto" />
          <p className="text-xl text-white/80">Your most active month was</p>
          <div className="text-5xl md:text-7xl font-black text-white">
            {stats.mostActiveMonth.name}
          </div>
          <p className="text-lg text-white/70">
            with {stats.mostActiveMonth.runCount} runs
          </p>
        </div>
      )
    },
    {
      id: "percentile",
      gradient: "from-orange-600 via-amber-500 to-yellow-500",
      content: (
        <div className="text-center space-y-6">
          <Trophy className="h-16 w-16 text-white/80 mx-auto" />
          <p className="text-xl text-white/80">You ran more than</p>
          <div className="text-6xl md:text-8xl font-black text-white">
            {stats.percentile}%
          </div>
          <p className="text-2xl text-white/90 font-bold">of runners</p>
          <p className="text-lg text-white/70">on RunAnalytics!</p>
        </div>
      )
    },
    {
      id: "outro",
      gradient: "from-gray-800 via-gray-700 to-gray-900",
      content: (
        <div className="text-center space-y-6">
          <h2 className="text-4xl md:text-5xl font-black text-white">
            Amazing Year! 🎉
          </h2>
          <p className="text-xl text-white/80 max-w-sm mx-auto">
            Keep crushing it in 2026. Your next PR is waiting!
          </p>
          <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3"
              data-testid="wrapped-share-button"
            >
              <Share2 className="h-5 w-5 mr-2" />
              Share
            </Button>
            <Link href="/dashboard">
              <Button 
                variant="outline" 
                className="border-white/30 text-white hover:bg-white/10 font-bold px-8 py-3"
              >
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900 overflow-hidden" ref={containerRef}>
      <SEO 
        title="2025 Running Wrapped | RunAnalytics"
        description={`${userName}'s 2025 running year in review - ${stats.totalDistance} ${stats.totalDistanceUnit}, ${stats.totalRuns} runs, and more!`}
      />
      
      <div className="fixed top-4 left-4 z-50">
        <Link href="/dashboard">
          <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Dashboard
          </Button>
        </Link>
      </div>

      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg mx-auto relative">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className={`w-full aspect-[9/16] max-h-[80vh] rounded-3xl bg-gradient-to-br ${slides[currentSlide].gradient} p-8 flex items-center justify-center shadow-2xl`}
              data-testid={`wrapped-slide-${slides[currentSlide].id}`}
            >
              {slides[currentSlide].content}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
              data-testid="wrapped-prev-button"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>

            <div className="flex gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setDirection(index > currentSlide ? 1 : -1);
                    setCurrentSlide(index);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide 
                      ? 'bg-white w-6' 
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                  data-testid={`wrapped-dot-${index}`}
                />
              ))}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={nextSlide}
              disabled={currentSlide === slides.length - 1}
              className="text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
              data-testid="wrapped-next-button"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
