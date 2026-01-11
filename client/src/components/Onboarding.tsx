import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, Activity, TrendingUp, Sparkles, Check } from "lucide-react";
import { StravaConnectButton } from "./StravaConnect";

interface OnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onStravaConnect: () => void;
  isStravaConnected: boolean;
}

const ONBOARDING_STEPS = [
  {
    title: "Welcome to RunAnalytics! 🎉",
    description: "Your personal AI-powered running coach and performance tracker",
    icon: Trophy,
    content: (
      <div className="space-y-4">
        <p className="text-gray-600">
          RunAnalytics combines cutting-edge AI with your running data to provide:
        </p>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-strava-orange mt-0.5 flex-shrink-0" />
            <span>Personalized insights and training recommendations</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-strava-orange mt-0.5 flex-shrink-0" />
            <span>Advanced performance analytics and trend tracking</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-strava-orange mt-0.5 flex-shrink-0" />
            <span>Race predictions and injury risk monitoring</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-strava-orange mt-0.5 flex-shrink-0" />
            <span>Comprehensive runner score to track your progress</span>
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: "Connect Your Strava Account",
    description: "Sync your activities to unlock powerful insights",
    icon: Activity,
    content: (isStravaConnected: boolean, onStravaConnect: () => void) => (
      <div className="space-y-4">
        <p className="text-gray-600">
          Strava is the world's leading platform for athletes. By connecting your account, we can:
        </p>
        <ul className="space-y-2 text-sm text-gray-600 mb-6">
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-strava-orange mt-0.5 flex-shrink-0" />
            <span>Automatically sync your running activities</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-strava-orange mt-0.5 flex-shrink-0" />
            <span>Analyze your performance data with AI</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-strava-orange mt-0.5 flex-shrink-0" />
            <span>Generate personalized training recommendations</span>
          </li>
        </ul>
        {!isStravaConnected && (
          <div className="flex justify-center py-4">
            <StravaConnectButton 
              onClick={onStravaConnect}
              variant="orange"
              size="lg"
            />
          </div>
        )}
        {isStravaConnected && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <Check className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-green-800 font-medium">Strava Connected!</p>
            <p className="text-sm text-green-600">Your activities are syncing now</p>
          </div>
        )}
      </div>
    ),
  },
  {
    title: "Your Runner Score Explained",
    description: "A comprehensive metric to track your running fitness",
    icon: TrendingUp,
    content: (
      <div className="space-y-4">
        <p className="text-gray-600">
          Your Runner Score is a unique composite metric (0-100) that evaluates:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <h4 className="font-semibold text-sm text-blue-900 mb-1">Endurance</h4>
            <p className="text-xs text-blue-700">Weekly mileage and consistency</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <h4 className="font-semibold text-sm text-purple-900 mb-1">Speed</h4>
            <p className="text-xs text-purple-700">Pace improvements and tempo</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <h4 className="font-semibold text-sm text-green-900 mb-1">Efficiency</h4>
            <p className="text-xs text-green-700">Heart rate and effort balance</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <h4 className="font-semibold text-sm text-orange-900 mb-1">Recovery</h4>
            <p className="text-xs text-orange-700">Rest days and training load</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 italic">
          Track your score over time to see your progress and identify areas for improvement!
        </p>
      </div>
    ),
  },
  {
    title: "Key Insights & Predictions",
    description: "Unlock the power of machine learning for your training",
    icon: Sparkles,
    content: (
      <div className="space-y-4">
        <p className="text-gray-600">
          Our AI engine analyzes your data to provide:
        </p>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-900">Smart Recommendations</h4>
              <p className="text-xs text-gray-600">Personalized training advice based on your goals</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-900">Race Predictions</h4>
              <p className="text-xs text-gray-600">Estimated finish times for 5K, 10K, half, and full marathons</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-900">Injury Prevention</h4>
              <p className="text-xs text-gray-600">Early warning signs and recovery guidance</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-strava-orange font-medium text-center pt-2">
          Ready to start your journey? Let's go! 🚀
        </p>
      </div>
    ),
  },
];

export default function Onboarding({ isOpen, onClose, onStravaConnect, isStravaConnected }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    onClose();
  };

  const step = ONBOARDING_STEPS[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" data-testid="onboarding-dialog">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-strava-orange to-orange-600 rounded-full flex items-center justify-center">
              <Icon className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-2xl text-center" data-testid="onboarding-step-title">
            {step.title}
          </DialogTitle>
          <DialogDescription className="text-center text-base" data-testid="onboarding-step-description">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6" data-testid={`onboarding-step-${currentStep}`}>
          {typeof step.content === 'function' 
            ? step.content(isStravaConnected, onStravaConnect)
            : step.content}
        </div>

        {/* Progress Indicator */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" data-testid="onboarding-progress-bar" />
          <div className="flex justify-center gap-2">
            {ONBOARDING_STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? 'bg-strava-orange w-6' 
                    : index < currentStep 
                    ? 'bg-strava-orange/50' 
                    : 'bg-gray-300'
                }`}
                data-testid={`onboarding-dot-${index}`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center gap-4 pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700"
            data-testid="onboarding-skip-button"
          >
            Skip
          </Button>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                data-testid="onboarding-previous-button"
              >
                Previous
              </Button>
            )}
            <Button
              onClick={handleNext}
              className="bg-strava-orange hover:bg-strava-orange/90 text-white min-w-[120px]"
              data-testid="onboarding-next-button"
            >
              {isLastStep ? 'Get Started' : 'Next'}
            </Button>
          </div>
        </div>

        {/* Step Counter */}
        <div className="text-center text-xs text-gray-500 mt-2" data-testid="onboarding-step-counter">
          Step {currentStep + 1} of {ONBOARDING_STEPS.length}
        </div>
      </DialogContent>
    </Dialog>
  );
}
