import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Battery, Zap, Calendar, ChevronRight, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface NextStepsProps {
  nextSteps: string[];
  consistencyLabel: "recovery" | "easier" | "consistent" | "harder" | "much_harder";
  effortScore: number;
}

const intensityConfig: Record<string, {
  icon: typeof Zap;
  title: string;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  recoveryHours: string;
  nextWorkoutTiming: string;
}> = {
  recovery: {
    icon: Battery,
    title: "Light Recovery Day",
    iconColor: "text-green-500",
    bgColor: "bg-gradient-to-br from-green-50 to-emerald-50",
    borderColor: "border-green-200",
    recoveryHours: "12-18",
    nextWorkoutTiming: "Ready for quality work tomorrow"
  },
  easier: {
    icon: ArrowDownRight,
    title: "Easy Effort",
    iconColor: "text-teal-500",
    bgColor: "bg-gradient-to-br from-teal-50 to-cyan-50",
    borderColor: "border-teal-200",
    recoveryHours: "18-24",
    nextWorkoutTiming: "Good to go for a harder session in 24h"
  },
  consistent: {
    icon: Minus,
    title: "Standard Training",
    iconColor: "text-blue-500",
    bgColor: "bg-gradient-to-br from-blue-50 to-indigo-50",
    borderColor: "border-blue-200",
    recoveryHours: "24-36",
    nextWorkoutTiming: "Allow 24-36h before next hard workout"
  },
  harder: {
    icon: ArrowUpRight,
    title: "Harder Effort",
    iconColor: "text-orange-500",
    bgColor: "bg-gradient-to-br from-orange-50 to-amber-50",
    borderColor: "border-orange-200",
    recoveryHours: "36-48",
    nextWorkoutTiming: "Focus on easy runs for the next 36-48h"
  },
  much_harder: {
    icon: Zap,
    title: "High Intensity Session",
    iconColor: "text-red-500",
    bgColor: "bg-gradient-to-br from-red-50 to-rose-50",
    borderColor: "border-red-200",
    recoveryHours: "48-72",
    nextWorkoutTiming: "Prioritize recovery for 48h minimum"
  }
};

export default function NextSteps({ nextSteps, consistencyLabel, effortScore }: NextStepsProps) {
  const config = intensityConfig[consistencyLabel] || intensityConfig.consistent;
  const IconComponent = config.icon;

  return (
    <Card className={`${config.bgColor} border-2 ${config.borderColor}`} data-testid="card-next-steps">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Clock className="w-6 h-6 text-gray-700" />
          Next 48 Hours
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-lg bg-white/60 flex items-center justify-center`}>
            <IconComponent className={`w-6 h-6 ${config.iconColor}`} />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900" data-testid="text-intensity-title">{config.title}</p>
            <p className="text-base font-medium text-gray-600">Effort Score: {effortScore}</p>
          </div>
        </div>

        <div className="bg-white/50 rounded-lg p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <span className="text-base font-semibold text-gray-800">Recovery Window</span>
          </div>
          <p className="text-base text-gray-700" data-testid="text-recovery-hours">
            {config.recoveryHours} hours recommended before next hard session
          </p>
        </div>

        <div className="bg-white/50 rounded-lg p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-gray-600" />
            <span className="text-base font-semibold text-gray-800">Training Guidance</span>
          </div>
          <p className="text-base text-gray-700" data-testid="text-next-workout">
            {config.nextWorkoutTiming}
          </p>
        </div>

        {nextSteps.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-sm font-bold text-gray-600 uppercase">Coach Tips</p>
            {nextSteps.map((step, index) => (
              <div key={index} className="flex items-start gap-2" data-testid={`next-step-${index}`}>
                <ChevronRight className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <span className="text-base text-gray-700">{step}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
