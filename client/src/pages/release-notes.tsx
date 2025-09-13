import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Activity, Calendar, Star, Bug, Wrench, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { RELEASE_NOTES, VERSION } from "@shared/version";
import Footer from "@/components/Footer";
import { useState } from "react";

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
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const currentRelease = RELEASE_NOTES[selectedVersionIndex];

  const navigateToVersion = (index: number) => {
    setSelectedVersionIndex(index);
  };

  const navigatePrevious = () => {
    if (selectedVersionIndex < RELEASE_NOTES.length - 1) {
      setSelectedVersionIndex(selectedVersionIndex + 1);
    }
  };

  const navigateNext = () => {
    if (selectedVersionIndex > 0) {
      setSelectedVersionIndex(selectedVersionIndex - 1);
    }
  };

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

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 min-h-screen sticky top-0">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-charcoal mb-4">Version History</h2>
            <div className="space-y-2">
              {RELEASE_NOTES.map((release, index) => (
                <button
                  key={release.version}
                  onClick={() => navigateToVersion(index)}
                  className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
                    selectedVersionIndex === index
                      ? 'bg-strava-orange text-white border-strava-orange shadow-md'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                  data-testid={`button-version-${release.version}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">v{release.version}</span>
                    {index === 0 && (
                      <Badge className={`text-xs px-2 py-1 ${
                        selectedVersionIndex === index
                          ? 'bg-white text-strava-orange'
                          : 'bg-strava-orange text-white'
                      }`}>
                        Latest
                      </Badge>
                    )}
                  </div>
                  <p className={`text-sm font-medium mb-1 ${
                    selectedVersionIndex === index ? 'text-white' : 'text-gray-800'
                  }`}>
                    {release.title}
                  </p>
                  <p className={`text-xs ${
                    selectedVersionIndex === index ? 'text-white/80' : 'text-gray-500'
                  }`}>
                    {new Date(release.date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 px-6 py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Badge className="bg-strava-orange text-white" data-testid="badge-current-version">
                Current Version: v{VERSION}
              </Badge>
              <p className="text-gray-600">
                Stay up-to-date with the latest improvements to RunAnalytics
              </p>
            </div>
            
            {/* Navigation Arrows */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={navigateNext}
                disabled={selectedVersionIndex === 0}
                className="flex items-center space-x-1"
                data-testid="button-next-version"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Newer</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={navigatePrevious}
                disabled={selectedVersionIndex === RELEASE_NOTES.length - 1}
                className="flex items-center space-x-1"
                data-testid="button-previous-version"
              >
                <span>Older</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Single Version Display */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                      <h2 className="text-2xl font-bold text-charcoal" data-testid={`text-version-${currentRelease.version}`}>
                        Version {currentRelease.version}
                      </h2>
                      {selectedVersionIndex === 0 && (
                        <Badge className="bg-strava-orange text-white px-3 py-1 rounded-full text-sm font-medium" data-testid="badge-latest">
                          Latest Release
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-lg text-gray-600 mt-1 font-medium">{currentRelease.title}</h3>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
                <Calendar size={18} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{new Date(currentRelease.date).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="p-8">
            <p className="text-gray-700 text-lg mb-8 leading-relaxed">{currentRelease.description}</p>
            
            <div className="space-y-6">
              <h4 className="text-xl font-semibold text-charcoal mb-6">What's New in This Release</h4>
              <div className="grid gap-4">
                {currentRelease.changes.map((change, changeIndex) => {
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
      </div>
      <Footer />
    </div>
  );
}