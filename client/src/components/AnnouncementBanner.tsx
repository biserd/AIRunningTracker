import { useState, useEffect } from "react";
import { X, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnnouncementBannerProps {
  onOpenChat: () => void;
}

export default function AnnouncementBanner({ onOpenChat }: AnnouncementBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const STORAGE_KEY = "ai_chat_announcement_dismissed";

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
  };

  const handleTryNow = () => {
    handleDismiss();
    onOpenChat();
  };

  if (!isVisible) return null;

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 p-6 mb-6 shadow-lg"
      data-testid="banner-ai-chat-announcement"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24" />

      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
        aria-label="Dismiss announcement"
        data-testid="button-dismiss-announcement"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Content */}
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
            <span>🎉 New Feature: AI Running Coach Chat</span>
          </h3>
          <p className="text-white/90 text-sm sm:text-base">
            Get instant, personalized running advice! Ask questions about your training, 
            get insights on demand, and have natural conversations about your running journey.
          </p>
        </div>

        <div className="flex-shrink-0 w-full sm:w-auto">
          <Button
            onClick={handleTryNow}
            className="w-full sm:w-auto bg-white text-purple-600 hover:bg-white/90 font-semibold shadow-md"
            data-testid="button-try-ai-chat"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Try It Now
          </Button>
        </div>
      </div>
    </div>
  );
}
