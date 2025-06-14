import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface ActivityData {
  id: number;
  name: string;
  distance: string;
  pace: string;
  duration: string;
  elevation: string;
  date: string;
}

interface RecentActivitiesProps {
  activities: ActivityData[];
  unitPreference?: string;
}

export default function RecentActivities({ activities, unitPreference }: RecentActivitiesProps) {
  const getActivityIcon = (index: number) => {
    const colors = [
      'bg-strava-orange/10 text-strava-orange',
      'bg-performance-blue/10 text-performance-blue',
      'bg-achievement-green/10 text-achievement-green'
    ];
    return colors[index % colors.length];
  };

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-charcoal">Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No activities yet</h3>
            <p className="text-gray-500">Connect to Strava and sync your activities to see them here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-charcoal">Recent Activities</CardTitle>
          <Button variant="ghost" className="text-strava-orange hover:text-strava-orange/80 p-0">
            View All <ArrowRight className="ml-1" size={16} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.slice(0, 3).map((activity, index) => (
            <Link key={activity.id} href={`/activity/${activity.id}`}>
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getActivityIcon(index)}`}>
                  <Activity size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-charcoal">{activity.name}</h4>
                  <p className="text-sm text-gray-600">{activity.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-charcoal">{activity.distance} {unitPreference === "miles" ? "mi" : "km"}</p>
                  <p className="text-sm text-gray-600">{activity.pace} /{unitPreference === "miles" ? "mi" : "km"}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-charcoal">{activity.duration}</p>
                  <p className="text-sm text-gray-600">{activity.elevation}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
