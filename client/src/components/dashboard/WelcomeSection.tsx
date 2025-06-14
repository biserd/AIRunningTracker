import { Calendar, RefreshCw } from "lucide-react";

interface WelcomeSectionProps {
  userName: string;
}

export default function WelcomeSection({ userName }: WelcomeSectionProps) {
  return (
    <div className="mb-8">
      <div className="bg-gradient-to-r from-orange-100 to-orange-200 border border-orange-300 rounded-xl p-6 shadow-lg">
        <h2 className="text-3xl font-bold mb-2 text-gray-900">Welcome back, {userName}!</h2>
        <p className="text-gray-800 text-lg">Here's your latest running performance analysis powered by AI</p>
        <div className="mt-4 flex items-center space-x-6 text-gray-700">
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
