import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ArrowRight, Brain, TrendingUp, BarChart } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  category: string;
  icon: any;
  gradient: string;
}

const blogPosts: BlogPost[] = [
  {
    slug: "ai-running-coach-complete-guide-2025",
    title: "AI Running Coach: Complete Guide 2025",
    description: "Everything you need to know about AI-powered running coaches, how they work, and how to use them to improve your training.",
    date: "November 21, 2025",
    readTime: "8 min read",
    category: "AI & Technology",
    icon: Brain,
    gradient: "from-purple-500 to-indigo-600"
  },
  {
    slug: "best-strava-analytics-tools-2025",
    title: "Best Strava Analytics Tools 2025",
    description: "Comprehensive comparison of the top Strava analytics platforms to help you choose the right tool for your training needs.",
    date: "November 21, 2025",
    readTime: "10 min read",
    category: "Tools & Reviews",
    icon: BarChart,
    gradient: "from-blue-500 to-cyan-600"
  },
  {
    slug: "how-to-improve-running-pace",
    title: "How to Improve Running Pace: Complete Guide",
    description: "Proven strategies and training methods to run faster, backed by science and tested by elite coaches.",
    date: "November 21, 2025",
    readTime: "12 min read",
    category: "Training Tips",
    icon: TrendingUp,
    gradient: "from-orange-500 to-red-600"
  }
];

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <SEO
        title="Running Blog - Training Tips, AI Coaching & Analytics | RunAnalytics"
        description="Expert running advice, AI coaching insights, training strategies, and comprehensive analytics guides. Learn how to improve your running performance with data-driven insights."
        keywords="running blog, training tips, AI running coach, running analytics, marathon training, race preparation, running performance"
        url="https://aitracker.run/blog"
        type="website"
      />
      <PublicHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-charcoal dark:text-white mb-4">
            Running Blog
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Expert insights on AI-powered training, performance analytics, and proven strategies to help you run faster and smarter.
          </p>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {blogPosts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <Card className="h-full hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                <CardHeader>
                  <div className={`w-12 h-12 bg-gradient-to-r ${post.gradient} rounded-xl flex items-center justify-center mb-4`}>
                    <post.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs">{post.category}</Badge>
                  </div>
                  <CardTitle className="text-xl font-bold text-charcoal dark:text-white mb-2 line-clamp-2">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-300 line-clamp-3">
                    {post.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{post.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{post.readTime}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-strava-orange" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-purple-500 to-indigo-600 border-0 text-white">
          <CardHeader className="text-center py-12">
            <CardTitle className="text-2xl sm:text-3xl font-bold mb-4">
              Ready to Transform Your Running?
            </CardTitle>
            <CardDescription className="text-white/90 text-lg mb-6 max-w-2xl mx-auto">
              Get personalized AI insights, race predictions, and comprehensive performance analytics for free.
            </CardDescription>
            <Link href="/auth">
              <button className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold transition-colors" data-testid="blog-cta-getstarted">
                Get Started Free
              </button>
            </Link>
          </CardHeader>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
