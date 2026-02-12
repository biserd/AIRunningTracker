import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Sparkles, Crown, Zap, Brain, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/ChatPanel";
import { cn } from "@/lib/utils";
import { useFeatureAccess } from "@/hooks/useSubscription";
import { Link } from "wouter";

export interface PageContext {
  pageName: string;
  pageDescription?: string;
  relevantData?: Record<string, any>;
}

interface FloatingAICoachProps {
  userId: number;
  className?: string;
  pageContext?: PageContext;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialConversationId?: number;
}

export function FloatingAICoach({ userId, className, pageContext, isOpen: controlledIsOpen, onOpenChange, initialConversationId }: FloatingAICoachProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const { canAccessAICoachChat } = useFeatureAccess();
  
  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalIsOpen(open);
    }
  };
  
  // Sync internal state with controlled state
  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setInternalIsOpen(controlledIsOpen);
    }
  }, [controlledIsOpen]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className={cn(
              "fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[480px] h-[560px] sm:h-[680px] max-h-[calc(100vh-8rem)]",
              "bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-purple-200 dark:border-purple-800 overflow-hidden"
            )}
          >
            {canAccessAICoachChat ? (
              <ChatPanel userId={userId} onClose={() => setIsOpen(false)} pageContext={pageContext} initialConversationId={initialConversationId} />
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-purple-100 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-white">Running Coach</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900"
                    data-testid="button-close-upgrade-cta"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center mb-4">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    Unlock Your AI Coach
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-xs">
                    Get personalized coaching, training insights, and real-time guidance from your AI running assistant.
                  </p>
                  
                  <div className="space-y-3 mb-6 w-full max-w-xs">
                    <div className="flex items-center gap-3 text-left p-3 bg-purple-50 dark:bg-purple-950/50 rounded-lg">
                      <Brain className="w-5 h-5 text-purple-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">Personalized training advice</span>
                    </div>
                    <div className="flex items-center gap-3 text-left p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">Performance analysis & insights</span>
                    </div>
                    <div className="flex items-center gap-3 text-left p-3 bg-orange-50 dark:bg-orange-950/50 rounded-lg">
                      <Zap className="w-5 h-5 text-strava-orange flex-shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">Real-time coaching responses</span>
                    </div>
                  </div>
                  
                  <Link href="/pricing">
                    <Button 
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 text-base font-semibold"
                      data-testid="button-upgrade-to-premium"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade to Premium
                    </Button>
                  </Link>
                  
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                    Premium includes unlimited AI coach access
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className={cn("fixed bottom-6 right-4 sm:right-6 z-40", className)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.5 }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-14 w-14 rounded-full shadow-lg",
            "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700",
            "transition-all duration-200 hover:scale-105"
          )}
          data-testid="button-open-ai-coach"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="w-6 h-6 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <MessageSquare className="w-6 h-6 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1 }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-900"
          />
        )}
      </motion.div>
    </>
  );
}
