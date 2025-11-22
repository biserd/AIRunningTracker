import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Calendar, Star, Bug, Wrench, AlertTriangle, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { Link } from "wouter";
import { RELEASE_NOTES, VERSION } from "@shared/version";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useState, useEffect } from "react";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentRelease = RELEASE_NOTES[selectedVersionIndex];

  const navigateToVersion = (index: number) => {
    setSelectedVersionIndex(index);
    setSidebarOpen(false);
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

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": `RunAnalytics v${currentRelease.version} Release Notes - ${currentRelease.title}`,
    "description": `${currentRelease.description} Released ${new Date(currentRelease.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`,
    "image": "https://aitracker.run/og-image.jpg",
    "author": {
      "@type": "Organization",
      "name": "RunAnalytics"
    },
    "publisher": {
      "@type": "Organization",
      "name": "RunAnalytics",
      "logo": {
        "@type": "ImageObject",
        "url": "https://aitracker.run/og-image.jpg"
      }
    },
    "datePublished": currentRelease.date,
    "dateModified": currentRelease.date,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://aitracker.run/release-notes#v${currentRelease.version}`
    },
    "about": {
      "@type": "SoftwareApplication",
      "name": "RunAnalytics",
      "applicationCategory": "HealthApplication",
      "operatingSystem": "Web"
    }
  };

  return (
    <div className="min-h-screen bg-light-grey">
      <SEO
        title={`RunAnalytics v${currentRelease.version} Release Notes - ${currentRelease.title}`}
        description={`${currentRelease.description} Released ${new Date(currentRelease.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`}
        keywords="RunAnalytics updates, running analytics changelog, new features, Strava analytics updates, AI running coach updates"
        url={`https://aitracker.run/release-notes#v${currentRelease.version}`}
        type="article"
        ogImage="https://aitracker.run/og-image.jpg"
        structuredData={articleSchema}
      />
      <PublicHeader />

      <div className="flex max-w-7xl mx-auto relative">
        {/* Sidebar - Hidden on mobile, overlay on mobile when open */}
        <div className={`
          fixed lg:sticky lg:block top-0 left-0 z-50 h-screen
          w-80 bg-white border-r border-gray-200
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-4 sm:p-6 overflow-y-auto h-full">
            <div className="flex items-center justify-between mb-4 lg:hidden">
              <h2 className="text-lg font-semibold text-charcoal">Version History</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <h2 className="text-lg font-semibold text-charcoal mb-4 hidden lg:block">Version History</h2>
            <div className="space-y-2">
              {RELEASE_NOTES.map((release, index) => (
                <button
                  key={release.version}
                  onClick={() => navigateToVersion(index)}
                  className={`w-full text-left p-3 sm:p-4 rounded-lg border transition-all duration-200 ${
                    selectedVersionIndex === index
                      ? 'bg-strava-orange text-white border-strava-orange shadow-md'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                  data-testid={`button-version-${release.version}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm sm:text-base">v{release.version}</span>
                    {index === 0 && (
                      <Badge className={`text-xs px-2 py-0.5 ${
                        selectedVersionIndex === index
                          ? 'bg-white text-strava-orange'
                          : 'bg-strava-orange text-white'
                      }`}>
                        Latest
                      </Badge>
                    )}
                  </div>
                  <p className={`text-xs sm:text-sm font-medium mb-1 line-clamp-2 ${
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

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-6 py-6 sm:py-12 min-w-0">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <Badge className="bg-strava-orange text-white w-fit text-xs sm:text-sm" data-testid="badge-current-version">
                  Current: v{VERSION}
                </Badge>
                <p className="text-sm sm:text-base text-gray-600">
                  Stay up-to-date with the latest improvements
                </p>
              </div>
              
              {/* Navigation Arrows */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigateNext}
                  disabled={selectedVersionIndex === 0}
                  className="flex items-center space-x-1 text-xs sm:text-sm"
                  data-testid="button-next-version"
                >
                  <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Newer</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigatePrevious}
                  disabled={selectedVersionIndex === RELEASE_NOTES.length - 1}
                  className="flex items-center space-x-1 text-xs sm:text-sm"
                  data-testid="button-previous-version"
                >
                  <span>Older</span>
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Single Version Display */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Clean Header Design */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 px-4 sm:px-8 py-4 sm:py-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-strava-orange to-orange-500 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                    <Activity className="text-white" size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <h2 className="text-xl sm:text-2xl font-bold text-charcoal" data-testid={`text-version-${currentRelease.version}`}>
                        Version {currentRelease.version}
                      </h2>
                      {selectedVersionIndex === 0 && (
                        <Badge className="bg-strava-orange text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium w-fit" data-testid="badge-latest">
                          Latest Release
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-lg text-gray-600 mt-1 font-medium">{currentRelease.title}</h3>
                  </div>
                </div>
                <div className="flex items-center space-x-2 bg-white px-3 sm:px-4 py-2 rounded-lg border border-gray-200 w-fit">
                  <Calendar size={16} className="text-gray-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">
                    {new Date(currentRelease.date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Content Area */}
            <div className="p-4 sm:p-8">
              <p className="text-sm sm:text-lg text-gray-700 mb-6 sm:mb-8 leading-relaxed">{currentRelease.description}</p>
              
              <div className="space-y-4 sm:space-y-6">
                <h4 className="text-lg sm:text-xl font-semibold text-charcoal mb-4 sm:mb-6">What's New in This Release</h4>
                <div className="grid gap-3 sm:gap-4">
                  {currentRelease.changes.map((change, changeIndex) => {
                    const Icon = changeTypeIcons[change.type];
                    return (
                      <div key={changeIndex} className={`flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-lg border ${changeTypeColors[change.type]}`}>
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${changeTypeIconColors[change.type]} border-current`}>
                          <Icon size={14} className="sm:w-4 sm:h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 sm:space-x-3 mb-1">
                            <span className="text-xs font-semibold uppercase tracking-wider opacity-75 capitalize">
                              {change.type}
                            </span>
                          </div>
                          <p className="text-sm sm:text-base text-gray-800 font-medium leading-relaxed break-words">{change.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 sm:mt-16 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 sm:p-8 text-center border border-gray-200">
            <div className="max-w-2xl mx-auto">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-strava-orange to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Star className="text-white" size={20} />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-charcoal mb-2 sm:mb-3">Help Shape RunAnalytics</h3>
              <p className="text-sm sm:text-lg text-gray-700 mb-4 sm:mb-6 leading-relaxed">
                Your feedback drives our innovation. Share your ideas and help us build the features that matter most to you.
              </p>
              <Link href="/contact">
                <Button 
                  size="lg" 
                  className="bg-strava-orange text-white hover:bg-strava-orange/90 px-6 sm:px-8 py-2 sm:py-3 text-base sm:text-lg font-medium rounded-lg shadow-sm w-full sm:w-auto" 
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
