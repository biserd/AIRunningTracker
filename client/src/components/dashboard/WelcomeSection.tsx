import { Calendar, RefreshCw } from "lucide-react";

interface WelcomeSectionProps {
  userName: string;
}

export default function WelcomeSection({ userName }: WelcomeSectionProps) {
  return (
    <div className="mb-8">
      <div className="bg-gradient-to-r from-strava-orange to-performance-blue rounded-xl p-6 text-white">
        <h2 className="text-3xl font-bold mb-2">Welcome back, {userName}!</h2>
        <p className="text-white/90 text-lg">Here's your latest running performance analysis powered by AI</p>
        <div className="mt-4 flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Calendar size={16} />
            <span>This Week</span>
          </div>
          <div className="flex items-center space-x-2">
            <RefreshCw size={16} />
            <span>Last sync: 2 hours ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
