import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Activity, Calendar, Star, Bug, Wrench, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { RELEASE_NOTES, VERSION } from "@shared/version";

const changeTypeIcons = {
  feature: Star,
  fix: Bug,
  improvement: Wrench,
  breaking: AlertTriangle
};

const changeTypeColors = {
  feature: "bg-green-100 text-green-800",
  fix: "bg-red-100 text-red-800", 
  improvement: "bg-blue-100 text-blue-800",
  breaking: "bg-orange-100 text-orange-800"
};

export default function ReleaseNotesPage() {
  return (
    <div className="min-h-screen bg-light-grey">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back-home">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-strava-orange rounded-lg flex items-center justify-center">
                <Activity className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-charcoal">Release Notes</h1>
                <p className="text-gray-600">Track new features, improvements, and fixes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Badge className="bg-strava-orange text-white" data-testid="badge-current-version">
              Current Version: v{VERSION}
            </Badge>
            <p className="text-gray-600">
              Stay up-to-date with the latest improvements to RunAnalytics
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {RELEASE_NOTES.map((release, index) => (
            <div key={release.version} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-strava-orange to-orange-600 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-3">
                      <h2 className="text-xl font-semibold" data-testid={`text-version-${release.version}`}>
                        Version {release.version}
                      </h2>
                      {index === 0 && (
                        <Badge className="bg-white text-strava-orange" data-testid="badge-latest">
                          Latest
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-lg opacity-90 mt-1">{release.title}</h3>
                  </div>
                  <div className="flex items-center space-x-2 text-orange-100">
                    <Calendar size={16} />
                    <span className="text-sm">{new Date(release.date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <p className="text-gray-700 mb-6">{release.description}</p>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-charcoal mb-3">What's New:</h4>
                  <ul className="space-y-3">
                    {release.changes.map((change, changeIndex) => {
                      const Icon = changeTypeIcons[change.type];
                      return (
                        <li key={changeIndex} className="flex items-start space-x-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${changeTypeColors[change.type]}`}>
                            <Icon size={12} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant="outline" 
                                className={`text-xs px-2 py-0.5 ${changeTypeColors[change.type]} border-0 capitalize`}
                                data-testid={`badge-change-type-${change.type}`}
                              >
                                {change.type}
                              </Badge>
                              <span className="text-gray-700">{change.description}</span>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-white rounded-lg p-6 text-center border border-gray-200">
          <h3 className="text-lg font-semibold text-charcoal mb-2">Want to suggest a feature?</h3>
          <p className="text-gray-600 mb-4">
            We're always looking to improve RunAnalytics based on your feedback.
          </p>
          <Link href="/contact">
            <Button className="bg-strava-orange text-white hover:bg-strava-orange/90" data-testid="button-suggest-feature">
              Suggest a Feature
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}