import { useState } from "react";
import { Target, Zap, Calendar, ChevronRight, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface CalibrationWizardProps {
  onComplete: () => void;
}

type Goal = "race" | "faster" | "endurance" | "injury_free";
type Struggle = "plateau" | "burnout" | "inconsistency" | "guesswork";
type Days = "3" | "4" | "5+";

const GOAL_OPTIONS: { value: Goal; emoji: string; title: string; description: string }[] = [
  { value: "race", emoji: "🏁", title: "Crush a Race", description: "I have a specific race coming up (5K, 10K, Half, Full)." },
  { value: "faster", emoji: "⚡", title: "Get Faster", description: "I want to beat my PRs, but no specific race yet." },
  { value: "endurance", emoji: "🏔️", title: "Build Endurance", description: "I want to run longer without stopping." },
  { value: "injury_free", emoji: "🛡️", title: "Stay Injury Free", description: "I want to run consistently without getting hurt." },
];

const STRUGGLE_OPTIONS: { value: Struggle; emoji: string; title: string; description: string }[] = [
  { value: "plateau", emoji: "📊", title: "Plateau", description: "I'm running hard but not getting faster." },
  { value: "burnout", emoji: "🔋", title: "Burnout / Fatigue", description: "I often feel tired or heavy-legged." },
  { value: "inconsistency", emoji: "📅", title: "Inconsistency", description: "I have trouble sticking to a schedule." },
  { value: "guesswork", emoji: "🎯", title: "Guesswork", description: "I don't know if I'm training correctly." },
];

const DAYS_OPTIONS: { value: Days; label: string }[] = [
  { value: "3", label: "3 Days" },
  { value: "4", label: "4 Days" },
  { value: "5+", label: "5+ Days" },
];

export default function CalibrationWizard({ onComplete }: CalibrationWizardProps) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [struggle, setStruggle] = useState<Struggle | null>(null);
  const [days, setDays] = useState<Days | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const handleGoalSelect = (value: Goal) => {
    setGoal(value);
    triggerTransition(1);
  };

  const handleStruggleSelect = (value: Struggle) => {
    setStruggle(value);
    triggerTransition(2);
  };

  const handleDaysSelect = async (value: Days) => {
    setDays(value);
    setIsSaving(true);
    setIsAnalyzing(true);

    try {
      await apiRequest("/api/calibration", "POST", {
        goal: goal!,
        struggle: struggle!,
        days: value,
      });

      setTimeout(() => {
        setIsAnalyzing(false);
        setIsSaving(false);
        onComplete();
      }, 2500);
    } catch (err) {
      console.error("Failed to save calibration:", err);
      setIsAnalyzing(false);
      setIsSaving(false);
      setSaveError(true);
    }
  };

  const triggerTransition = (nextStep: number) => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setStep(nextStep);
    }, 800);
  };

  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-4 border-strava-orange/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-strava-orange animate-spin" />
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-orange-400 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
            <div className="absolute inset-4 rounded-full border-4 border-transparent border-t-orange-300 animate-spin" style={{ animationDuration: '2s' }} />
          </div>
          <p className="text-charcoal text-xl font-medium animate-pulse">
            {isSaving ? "Building your profile..." : "Analyzing..."}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            {isSaving ? "Calibrating insights to your goals" : "Processing your answer"}
          </p>
        </div>
      </div>
    );
  }

  if (saveError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-charcoal text-xl font-semibold mb-3">Something went wrong</h2>
          <p className="text-gray-500 text-sm mb-6">We couldn't save your profile. Please try again.</p>
          <button
            onClick={() => {
              setSaveError(false);
              if (days) handleDaysSelect(days);
            }}
            className="px-6 py-3 bg-strava-orange text-white rounded-xl font-medium hover:bg-strava-orange/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const stepIcons = [Target, Zap, Calendar];
  const StepIcon = stepIcons[step];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="flex items-center justify-center gap-3 mb-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                  i < step ? 'bg-green-500 scale-90' : i === step ? 'bg-strava-orange scale-110 ring-4 ring-strava-orange/20' : 'bg-gray-200'
                }`}>
                  {i < step ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <span className={`text-sm font-bold ${i === step ? 'text-white' : 'text-gray-500'}`}>{i + 1}</span>
                  )}
                </div>
                {i < 2 && (
                  <div className={`w-12 h-0.5 transition-all duration-500 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          <p className="text-center text-strava-orange/80 text-xs font-medium tracking-widest uppercase mb-8 mt-4">
            Calibrating your profile...
          </p>

          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <StepIcon className="w-7 h-7 text-strava-orange" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-3">
              {step === 0 && "What is your primary focus right now?"}
              {step === 1 && "What's been your biggest frustration?"}
              {step === 2 && "How many days per week can you train?"}
            </h1>
            <p className="text-gray-500 text-sm">
              {step === 0 && "To build your perfect plan, we need to know your north star."}
              {step === 1 && "Understanding your pain point helps us target the right solution."}
              {step === 2 && "Be realistic — consistency beats volume every time."}
            </p>
          </div>

          {step === 0 && (
            <div className="space-y-3">
              {GOAL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleGoalSelect(option.value)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 group hover:scale-[1.02] active:scale-[0.98] ${
                    goal === option.value
                      ? 'border-strava-orange bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/50 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-2xl mt-0.5">{option.emoji}</span>
                    <div className="flex-1">
                      <h3 className="text-charcoal font-semibold text-lg mb-1">{option.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">{option.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-strava-orange mt-1 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              {STRUGGLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStruggleSelect(option.value)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 group hover:scale-[1.02] active:scale-[0.98] ${
                    struggle === option.value
                      ? 'border-strava-orange bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/50 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-2xl mt-0.5">{option.emoji}</span>
                    <div className="flex-1">
                      <h3 className="text-charcoal font-semibold text-lg mb-1">{option.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">{option.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-strava-orange mt-1 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="flex gap-4 justify-center">
              {DAYS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleDaysSelect(option.value)}
                  className={`flex-1 max-w-[140px] p-6 rounded-2xl border-2 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] text-center ${
                    days === option.value
                      ? 'border-strava-orange bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/50 shadow-sm'
                  }`}
                >
                  <span className="text-3xl font-bold text-charcoal block mb-1">
                    {option.value === "5+" ? "5+" : option.value}
                  </span>
                  <span className="text-gray-500 text-sm">days/week</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
