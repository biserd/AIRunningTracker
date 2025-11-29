import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Footprints, Search, Repeat, ChevronRight, Sparkles } from "lucide-react";
import { Link } from "wouter";

export default function ShoeHub() {
  const shoeTools = [
    {
      title: "Shoe Finder",
      description: "Get personalized shoe recommendations based on your running style",
      href: "/tools/shoe-finder",
      icon: Search,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Browse Shoes",
      description: "Explore 100+ verified shoes from 16 top brands",
      href: "/tools/shoes",
      icon: Footprints,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Rotation Planner",
      description: "Build a complete shoe rotation for your training",
      href: "/tools/rotation-planner",
      icon: Repeat,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  return (
    <Card className="border-purple-200" data-testid="shoe-hub-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center">
              <Footprints className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-lg font-semibold text-charcoal">Running Shoe Hub</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
            <Sparkles className="w-3 h-3 mr-1" />
            New
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600 mb-4">
          Find the perfect shoes for your training with our comprehensive database and AI-powered recommendations.
        </p>
        
        {shoeTools.map((tool, index) => (
          <Link key={index} href={tool.href}>
            <div 
              className={`p-3 ${tool.bgColor} rounded-lg border border-gray-200 hover:border-gray-300 transition-all hover:shadow-sm cursor-pointer group`}
              data-testid={`shoe-tool-${index}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm`}>
                    <tool.icon className={`w-4 h-4 ${tool.color}`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-charcoal">{tool.title}</h4>
                    <p className="text-xs text-gray-500">{tool.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </div>
          </Link>
        ))}

        <div className="pt-2">
          <Link href="/tools">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-xs border-purple-200 hover:bg-purple-50 hover:border-purple-300"
              data-testid="button-all-tools"
            >
              View All Free Tools
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
