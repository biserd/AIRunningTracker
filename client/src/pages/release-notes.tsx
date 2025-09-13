import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Activity, Calendar, Star, Bug, Wrench, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { RELEASE_NOTES, VERSION } from "@shared/version";
import Footer from "@/components/Footer";

const changeTypeIcons = {
  feature: Star,
  fix: Bug,
  improvement: Wrench,
  breaking: AlertTriangle
};

const changeTypeColors = {
  feature: "bg-green-50 text-green-700 border-green-200",
  fix: "bg-red-50 text-red-700 border-red-200", 
  improvement: "bg-blue-50 text-blue-700 border-blue-200",
  breaking: "bg-orange-50 text-orange-700 border-orange-200"
};

const changeTypeIconColors = {
  feature: "text-green-600",
  fix: "text-red-600",
  improvement: "text-blue-600",
  breaking: "text-orange-600"
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

        <div className="space-y-12">
          {RELEASE_NOTES.map((release, index) => (
            <div key={release.version} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Clean Header Design */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 px-8 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-strava-orange to-orange-500 rounded-xl flex items-center justify-center shadow-sm">
                        <Activity className="text-white" size={24} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-3">
                          <h2 className="text-2xl font-bold text-charcoal" data-testid={`text-version-${release.version}`}>
                            Version {release.version}
                          </h2>
                          {index === 0 && (
                            <Badge className="bg-strava-orange text-white px-3 py-1 rounded-full text-sm font-medium" data-testid="badge-latest">
                              Latest Release
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-lg text-gray-600 mt-1 font-medium">{release.title}</h3>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
                    <Calendar size={18} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{new Date(release.date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</span>
                  </div>
                </div>
              </div>
              
              {/* Content Area */}
              <div className="p-8">
                <p className="text-gray-700 text-lg mb-8 leading-relaxed">{release.description}</p>
                
                <div className="space-y-6">
                  <h4 className="text-xl font-semibold text-charcoal mb-6">What's New in This Release</h4>
                  <div className="grid gap-4">
                    {release.changes.map((change, changeIndex) => {
                      const Icon = changeTypeIcons[change.type];
                      return (
                        <div key={changeIndex} className={`flex items-start space-x-4 p-4 rounded-lg border ${changeTypeColors[change.type]}`}>
                          <div className={`w-8 h-8 rounded-lg bg-white border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${changeTypeIconColors[change.type]} border-current`}>
                            <Icon size={16} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-1">
                              <span className="text-xs font-semibold uppercase tracking-wider opacity-75 capitalize">
                                {change.type}
                              </span>
                            </div>
                            <p className="text-gray-800 font-medium leading-relaxed">{change.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 text-center border border-gray-200">
          <div className="max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-gradient-to-r from-strava-orange to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="text-white" size={24} />
            </div>
            <h3 className="text-2xl font-bold text-charcoal mb-3">Help Shape RunAnalytics</h3>
            <p className="text-gray-700 mb-6 text-lg leading-relaxed">
              Your feedback drives our innovation. Share your ideas and help us build the features that matter most to you.
            </p>
            <Link href="/contact">
              <Button 
                size="lg" 
                className="bg-strava-orange text-white hover:bg-strava-orange/90 px-8 py-3 text-lg font-medium rounded-lg shadow-sm" 
                data-testid="button-suggest-feature"
              >
                Share Your Ideas
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}