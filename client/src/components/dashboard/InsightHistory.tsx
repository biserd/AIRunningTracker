import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, TrendingDown, Activity, Heart, Zap, Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface HistoricalInsight {
  id: number;
  title: string;
  content: string;
  confidence: number;
  createdAt: string;
}

interface TimelineDay {
  date: string;
  insights: {
    performance: HistoricalInsight[];
    pattern: HistoricalInsight[];
    recovery: HistoricalInsight[];
    motivation: HistoricalInsight[];
    technique: HistoricalInsight[];
    recommendation: HistoricalInsight[];
  };
}

interface InsightHistoryProps {
  userId: number;
}

const getInsightIcon = (type: string) => {
  switch (type) {
    case 'performance': return <TrendingUp className="h-4 w-4" />;
    case 'pattern': return <Activity className="h-4 w-4" />;
    case 'recovery': return <Heart className="h-4 w-4" />;
    case 'motivation': return <Zap className="h-4 w-4" />;
    case 'technique': return <Target className="h-4 w-4" />;
    default: return <Clock className="h-4 w-4" />;
  }
};

const getInsightColor = (type: string) => {
  switch (type) {
    case 'performance': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'pattern': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'recovery': return 'bg-green-100 text-green-800 border-green-200';
    case 'motivation': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'technique': return 'bg-purple-100 text-purple-800 border-purple-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function InsightHistory({ userId }: InsightHistoryProps) {
  const { data, isLoading, error } = useQuery<{ timeline: TimelineDay[] }>({
    queryKey: ['/api/insights/history', userId],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-gray-500" />
            <CardTitle className="text-xl font-semibold text-charcoal">Insight History</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data || data.timeline.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-gray-500" />
            <CardTitle className="text-xl font-semibold text-charcoal">Insight History</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No insight history yet</h3>
            <p className="text-gray-500 text-sm">Generate insights over time to see your progress timeline here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const insightTypes = ['performance', 'pattern', 'recovery', 'motivation', 'technique'] as const;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-3">
          <Clock className="h-5 w-5 text-gray-500" />
          <CardTitle className="text-xl font-semibold text-charcoal">Insight History</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
            <TabsTrigger value="pattern" data-testid="tab-pattern">Pattern</TabsTrigger>
            <TabsTrigger value="recovery" data-testid="tab-recovery">Recovery</TabsTrigger>
            <TabsTrigger value="motivation" data-testid="tab-motivation">Motivation</TabsTrigger>
            <TabsTrigger value="technique" data-testid="tab-technique">Technique</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-4">
            {data.timeline.map((day) => {
              const hasInsights = insightTypes.some(type => day.insights[type].length > 0);
              if (!hasInsights) return null;

              return (
                <div key={day.date} className="border-l-2 border-gray-200 pl-4 pb-4" data-testid={`timeline-day-${day.date}`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-3 h-3 bg-gray-400 rounded-full -ml-6 border-2 border-white"></div>
                    <h4 className="font-semibold text-gray-900">
                      {format(new Date(day.date), 'MMMM d, yyyy')}
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {insightTypes.map(type => 
                      day.insights[type].map(insight => (
                        <div key={insight.id} className="bg-white border rounded-lg p-3 shadow-sm" data-testid={`insight-${insight.id}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className={getInsightColor(type)}>
                                {getInsightIcon(type)}
                                <span className="ml-1 capitalize">{type}</span>
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {format(new Date(insight.createdAt), 'h:mm a')}
                              </span>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {Math.round(insight.confidence * 100)}% confidence
                            </Badge>
                          </div>
                          <h5 className="font-medium text-gray-900 mb-1">{insight.title}</h5>
                          <p className="text-sm text-gray-700">{insight.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          {insightTypes.map(type => (
            <TabsContent key={type} value={type} className="space-y-4 mt-4">
              {data.timeline
                .filter(day => day.insights[type].length > 0)
                .map((day) => (
                  <div key={day.date} className="border-l-2 border-gray-200 pl-4 pb-4" data-testid={`timeline-${type}-${day.date}`}>
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-3 h-3 bg-gray-400 rounded-full -ml-6 border-2 border-white"></div>
                      <h4 className="font-semibold text-gray-900">
                        {format(new Date(day.date), 'MMMM d, yyyy')}
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {day.insights[type].map(insight => (
                        <div key={insight.id} className="bg-white border rounded-lg p-3 shadow-sm" data-testid={`insight-${type}-${insight.id}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className={getInsightColor(type)}>
                                {getInsightIcon(type)}
                                <span className="ml-1 capitalize">{type}</span>
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {format(new Date(insight.createdAt), 'h:mm a')}
                              </span>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {Math.round(insight.confidence * 100)}% confidence
                            </Badge>
                          </div>
                          <h5 className="font-medium text-gray-900 mb-1">{insight.title}</h5>
                          <p className="text-sm text-gray-700">{insight.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}