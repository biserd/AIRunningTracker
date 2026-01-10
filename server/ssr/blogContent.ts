export interface BlogPostContent {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  category: string;
  content: string;
  tableOfContents?: { id: string; title: string }[];
}

export const blogPosts: BlogPostContent[] = [
  {
    slug: "ai-agent-coach-proactive-coaching",
    title: "AI Agent Coach: How Proactive AI Coaching Transforms Your Running",
    description: "Discover how AI Agent Coach analyzes every run and delivers personalized coaching recaps, next-step recommendations, and training insights without you asking.",
    date: "January 18, 2026",
    readTime: "10 min read",
    category: "Premium Features",
    tableOfContents: [
      { id: "what-is", title: "What is AI Agent Coach?" },
      { id: "how-it-works", title: "How Proactive Coaching Works" },
      { id: "features", title: "Key Features" },
      { id: "benefits", title: "Benefits for Runners" },
      { id: "getting-started", title: "Getting Started" }
    ],
    content: `
      <h2 id="what-is">What is AI Agent Coach?</h2>
      <p>AI Agent Coach is RunAnalytics' Premium feature that provides proactive, personalized coaching after every run. Unlike traditional coaching apps that wait for you to ask questions, AI Agent Coach automatically analyzes your activities and delivers actionable insights.</p>
      <p>Think of it as having a dedicated running coach who reviews every single workout and provides immediate feedback, recovery recommendations, and adjustments to your training plan.</p>
      
      <h2 id="how-it-works">How Proactive Coaching Works</h2>
      <p>After each run syncs from Strava, AI Agent Coach:</p>
      <ul>
        <li>Analyzes your pace, heart rate, cadence, and elevation data</li>
        <li>Compares performance to your historical patterns</li>
        <li>Identifies areas of improvement and potential concerns</li>
        <li>Generates a personalized coaching recap</li>
        <li>Suggests next steps based on your goals and training plan</li>
      </ul>
      
      <h2 id="features">Key Features</h2>
      <p><strong>Post-Activity Recaps:</strong> Get instant analysis and feedback after every run, highlighting what went well and what to focus on next.</p>
      <p><strong>Training Plan Integration:</strong> AI Agent Coach understands your current training plan and adjusts recommendations accordingly.</p>
      <p><strong>Goal Tracking:</strong> Track progress toward your race goals with AI-powered predictions and milestone updates.</p>
      <p><strong>Recovery Guidance:</strong> Receive personalized recovery recommendations based on your training load and fatigue levels.</p>
      
      <h2 id="benefits">Benefits for Runners</h2>
      <p>Runners using AI Agent Coach report:</p>
      <ul>
        <li>Better adherence to training plans</li>
        <li>Faster recovery between hard workouts</li>
        <li>More confidence in race-day preparation</li>
        <li>Reduced injury risk through early detection</li>
      </ul>
      
      <h2 id="getting-started">Getting Started</h2>
      <p>AI Agent Coach is available to Premium subscribers. Connect your Strava account, set your goals, and start receiving proactive coaching after your very next run.</p>
    `
  },
  {
    slug: "how-to-pick-a-training-plan",
    title: "How to Pick a Training Plan: Complete Guide",
    description: "Learn how to choose the right training plan for your running goals. Discover why AI-personalized plans outperform generic schedules.",
    date: "January 12, 2026",
    readTime: "15 min read",
    category: "Training Plans",
    tableOfContents: [
      { id: "why-plans-matter", title: "Why Training Plans Matter" },
      { id: "types", title: "Types of Training Plans" },
      { id: "factors", title: "Factors to Consider" },
      { id: "ai-advantage", title: "The AI Advantage" },
      { id: "choosing", title: "Choosing Your Plan" }
    ],
    content: `
      <h2 id="why-plans-matter">Why Training Plans Matter</h2>
      <p>A good training plan is the foundation of running success. It provides structure, progressive overload, and adequate recovery—the three pillars of improvement.</p>
      <p>Without a plan, runners often fall into common traps: running too hard on easy days, not running hard enough on workout days, or building mileage too quickly.</p>
      
      <h2 id="types">Types of Training Plans</h2>
      <p><strong>Static Plans:</strong> Pre-written schedules that don't adapt to your progress. Good for beginners but limited for experienced runners.</p>
      <p><strong>Coach-Written Plans:</strong> Customized by a human coach based on your goals and fitness level. Excellent but expensive.</p>
      <p><strong>AI-Generated Plans:</strong> Personalized plans that adapt in real-time based on your training data, fatigue levels, and progress.</p>
      
      <h2 id="factors">Factors to Consider</h2>
      <ul>
        <li><strong>Goal Race:</strong> Your target event determines the plan structure</li>
        <li><strong>Current Fitness:</strong> Start from where you are, not where you want to be</li>
        <li><strong>Available Time:</strong> Be realistic about how many days you can train</li>
        <li><strong>Injury History:</strong> Past injuries should influence plan design</li>
        <li><strong>Life Stress:</strong> Work, family, and other commitments affect recovery</li>
      </ul>
      
      <h2 id="ai-advantage">The AI Advantage</h2>
      <p>AI-generated training plans offer significant advantages over static plans:</p>
      <ul>
        <li>Real-time adaptation based on your actual performance</li>
        <li>Automatic adjustment for missed workouts or life events</li>
        <li>Integration with recovery and fatigue metrics</li>
        <li>Personalized pacing recommendations for each workout</li>
      </ul>
      
      <h2 id="choosing">Choosing Your Plan</h2>
      <p>The best plan is one you can follow consistently. Consider your goals, schedule, and running experience when making your choice. AI-powered plans from RunAnalytics adapt to your needs while providing the structure necessary for improvement.</p>
    `
  },
  {
    slug: "ai-running-coach-complete-guide-2026",
    title: "AI Running Coach: Complete Guide 2026",
    description: "Discover everything about AI running coaches in 2026. Learn how AI-powered coaching works, benefits vs human coaches, and how to maximize your training with RunAnalytics AI Coach.",
    date: "January 15, 2026",
    readTime: "8 min read",
    category: "AI & Technology",
    tableOfContents: [
      { id: "what-is", title: "What is an AI Running Coach?" },
      { id: "how-it-works", title: "How AI Running Coaches Work" },
      { id: "benefits", title: "Benefits of AI Coaching" },
      { id: "vs-human", title: "AI Coach vs Human Coach" },
      { id: "runanalytics", title: "How to Use RunAnalytics AI Coach" },
      { id: "tips", title: "Tips for Maximum Results" }
    ],
    content: `
      <h2 id="what-is">What is an AI Running Coach?</h2>
      <p>An AI running coach is a sophisticated software system that uses artificial intelligence and machine learning algorithms to provide personalized running guidance, training plans, and performance analysis. Unlike static training plans or basic fitness apps, AI coaches adapt to your unique physiology, goals, and progress in real-time.</p>
      <p>Think of it as having a personal coach who never sleeps, analyzes thousands of data points from your runs, and continuously learns from your performance to provide increasingly accurate recommendations.</p>
      
      <h2 id="how-it-works">How AI Running Coaches Work</h2>
      <p>Modern AI running coaches leverage multiple technologies:</p>
      <ul>
        <li><strong>Data Analysis:</strong> AI coaches analyze vast amounts of running data including pace, heart rate, cadence, elevation, distance, and recovery metrics.</li>
        <li><strong>Machine Learning:</strong> Algorithms learn from your historical data to predict future performance and identify patterns.</li>
        <li><strong>Natural Language Processing:</strong> Enables conversational interactions where you can ask questions about your training.</li>
      </ul>
      
      <h2 id="benefits">Benefits of AI Coaching</h2>
      <ul>
        <li>24/7 availability for questions and guidance</li>
        <li>Objective analysis without emotional bias</li>
        <li>Rapid processing of complex training data</li>
        <li>Consistent tracking and accountability</li>
        <li>Cost-effective compared to human coaching</li>
      </ul>
      
      <h2 id="vs-human">AI Coach vs Human Coach</h2>
      <p>AI coaches excel at data analysis and availability, while human coaches bring experience, intuition, and emotional support. The ideal approach often combines both: AI handles daily analysis and routine questions, while human coaches provide strategic guidance and motivation.</p>
      
      <h2 id="runanalytics">How to Use RunAnalytics AI Coach</h2>
      <p>RunAnalytics AI Coach integrates seamlessly with your Strava data. Simply connect your account, and the AI begins learning from your running history. Use the chat interface to ask questions, get training recommendations, or analyze specific runs.</p>
      
      <h2 id="tips">Tips for Maximum Results</h2>
      <ul>
        <li>Sync all your runs to provide comprehensive data</li>
        <li>Set clear goals so the AI can optimize recommendations</li>
        <li>Ask specific questions for better insights</li>
        <li>Review AI suggestions and provide feedback</li>
        <li>Be consistent with your training to see patterns emerge</li>
      </ul>
    `
  },
  {
    slug: "best-strava-analytics-tools-2026",
    title: "Best Strava Analytics Tools 2026",
    description: "Comprehensive comparison of the top Strava analytics platforms to help you choose the right tool for your training needs.",
    date: "January 15, 2026",
    readTime: "10 min read",
    category: "Tools & Reviews",
    tableOfContents: [
      { id: "overview", title: "Overview of Strava Analytics" },
      { id: "comparison", title: "Tool Comparison" },
      { id: "features", title: "Key Features to Consider" },
      { id: "recommendations", title: "Our Recommendations" }
    ],
    content: `
      <h2 id="overview">Overview of Strava Analytics</h2>
      <p>While Strava provides basic analytics, many runners seek deeper insights into their training. Third-party analytics tools connect to Strava's API to provide advanced metrics, trend analysis, and AI-powered coaching.</p>
      
      <h2 id="comparison">Tool Comparison</h2>
      <p>The market offers several options for serious runners:</p>
      <ul>
        <li><strong>RunAnalytics:</strong> AI-powered insights, race predictions, and personalized coaching. Best for runners wanting intelligent analysis.</li>
        <li><strong>Elevate:</strong> Browser extension with performance metrics. Good for quick stats overlay.</li>
        <li><strong>Smashrun:</strong> Badge-based motivation with good visualizations. Fun for gamification.</li>
        <li><strong>Running Ahead:</strong> Detailed logging and analysis. Good for data enthusiasts.</li>
      </ul>
      
      <h2 id="features">Key Features to Consider</h2>
      <ul>
        <li>AI coaching and personalized recommendations</li>
        <li>Race prediction accuracy</li>
        <li>Training load and fatigue monitoring</li>
        <li>Heart rate zone analysis</li>
        <li>Long-term trend visualization</li>
        <li>Mobile app availability</li>
      </ul>
      
      <h2 id="recommendations">Our Recommendations</h2>
      <p>For most runners, we recommend choosing a tool that offers both comprehensive analytics and actionable insights. Look for platforms that don't just show you data, but help you understand what it means for your training.</p>
      <p>RunAnalytics stands out for its AI-powered coaching features, which go beyond simple metrics to provide personalized training recommendations and race predictions.</p>
    `
  },
  {
    slug: "how-to-improve-running-pace",
    title: "How to Improve Running Pace: Complete Guide",
    description: "Proven strategies and training methods to run faster, backed by science and tested by elite coaches.",
    date: "January 15, 2026",
    readTime: "12 min read",
    category: "Training Tips",
    tableOfContents: [
      { id: "fundamentals", title: "Pace Improvement Fundamentals" },
      { id: "workouts", title: "Key Workouts" },
      { id: "recovery", title: "Recovery and Adaptation" },
      { id: "tracking", title: "Tracking Progress" }
    ],
    content: `
      <h2 id="fundamentals">Pace Improvement Fundamentals</h2>
      <p>Improving running pace requires a balanced approach combining aerobic development, speed work, and proper recovery. The 80/20 rule suggests 80% of training should be easy, with 20% at higher intensities.</p>
      <p>Most runners make the mistake of running too hard on easy days, which impairs recovery and limits the quality of hard workouts. Learning to run truly easy is often the first step to running faster.</p>
      
      <h2 id="workouts">Key Workouts</h2>
      <p><strong>Tempo Runs:</strong> Sustained efforts at threshold pace build lactate clearance and mental toughness. Start with 20 minutes and build to 40+ minutes.</p>
      <p><strong>Intervals:</strong> Short, fast repeats at 5K pace or faster develop speed and running economy. Examples: 8x400m, 6x800m, or 4x1000m.</p>
      <p><strong>Long Runs:</strong> The foundation of endurance. Build progressively and include some faster-finish long runs.</p>
      <p><strong>Strides:</strong> Short accelerations (20-30 seconds) after easy runs maintain leg speed without adding fatigue.</p>
      
      <h2 id="recovery">Recovery and Adaptation</h2>
      <p>Fitness improves during recovery, not during workouts. Key recovery practices include:</p>
      <ul>
        <li>Adequate sleep (7-9 hours for most runners)</li>
        <li>Proper nutrition with emphasis on carbohydrates and protein</li>
        <li>Easy days between hard workouts</li>
        <li>Periodic recovery weeks with reduced volume</li>
      </ul>
      
      <h2 id="tracking">Tracking Progress</h2>
      <p>Use analytics tools like RunAnalytics to monitor your improvement over time. Key metrics to track include:</p>
      <ul>
        <li>Average pace at similar heart rates (cardiac drift)</li>
        <li>Race prediction trends</li>
        <li>Training load and acute-to-chronic ratio</li>
        <li>VO2 max estimates</li>
      </ul>
      <p>Small, consistent improvements add up. A 1% improvement each month leads to significant gains over a training cycle.</p>
    `
  }
];

export function getBlogPostBySlug(slug: string): BlogPostContent | undefined {
  return blogPosts.find(post => post.slug === slug);
}

export function getAllBlogPosts(): BlogPostContent[] {
  return blogPosts;
}
