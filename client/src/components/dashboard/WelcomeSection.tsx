import { Calendar, RefreshCw } from "lucide-react";

interface WelcomeSectionProps {
  userName: string;
}

export default function WelcomeSection({ userName }: WelcomeSectionProps) {
  return (
    <div className="mb-8">
      <div className="bg-gradient-to-r from-strava-orange via-orange-600 to-red-600 rounded-xl p-6 text-white shadow-lg">
        <h2 className="text-3xl font-bold mb-2 text-white drop-shadow-sm">Welcome back, {userName}!</h2>
        <p className="text-white text-lg drop-shadow-sm">Here's your latest running performance analysis powered by AI</p>
        <div className="mt-4 flex items-center space-x-6 text-white">
          <div className="flex items-center space-x-2">
            <Calendar size={16} className="drop-shadow-sm" />
            <span className="drop-shadow-sm">This Week</span>
          </div>
          <div className="flex items-center space-x-2">
            <RefreshCw size={16} className="drop-shadow-sm" />
            <span className="drop-shadow-sm">Last sync: 2 hours ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
