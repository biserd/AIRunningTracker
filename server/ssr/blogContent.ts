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
  },
  {
    slug: "ultra-marathon-training-plan-100-miler-guide",
    title: "Ultra Marathon Training Plan: The Complete Guide to Training for a 100 Miler",
    description: "Everything you need to know about creating an ultra marathon training plan for your first 100 mile race. Covers periodization, back-to-back long runs, fueling strategy, vertical gain training, tapering, and race day execution.",
    date: "February 11, 2026",
    readTime: "20 min read",
    category: "Ultra Running",
    tableOfContents: [
      { id: "introduction", title: "Why Train for a 100 Miler?" },
      { id: "prerequisites", title: "Prerequisites: Are You Ready?" },
      { id: "ultra-marathon-training-plan-structure", title: "Ultra Marathon Training Plan Structure" },
      { id: "periodization", title: "Periodization for Ultra Distances" },
      { id: "long-runs-and-back-to-back", title: "Long Runs and Back-to-Back Training" },
      { id: "vertical-gain-training", title: "Vertical Gain and Terrain-Specific Training" },
      { id: "fueling-strategy", title: "Fueling Strategy for 100 Miles" },
      { id: "mental-preparation", title: "Mental Preparation for Ultra Running" },
      { id: "tapering", title: "Tapering for Your 100 Mile Race" },
      { id: "gear-and-equipment", title: "Gear and Equipment Essentials" },
      { id: "race-day", title: "Race Day Execution" },
      { id: "ai-training-plans", title: "AI-Powered Ultra Marathon Training Plans" }
    ],
    content: `
      <h2 id="introduction">Why Train for a 100 Miler?</h2>
      <p>Running 100 miles is one of the most demanding endurance challenges on the planet. Whether you're stepping up from a marathon or progressing through shorter ultra distances, a well-structured <strong>ultra marathon training plan</strong> is the difference between crossing the finish line and dropping out at mile 60. This guide covers everything you need to build a 100 mile training plan that prepares your body, your mind, and your fueling strategy for the long haul.</p>
      <p>Unlike marathon training, where the focus is primarily on speed and aerobic threshold, ultra marathon training emphasizes time on feet, resilience, fueling under fatigue, and the ability to keep moving through the night. Your <strong>ultra running training</strong> plan needs to account for all of these factors — and that's exactly what we'll break down here.</p>

      <h2 id="prerequisites">Prerequisites: Are You Ready for an Ultra Marathon Training Plan?</h2>
      <p>Before starting a <strong>100 mile training plan</strong>, you need a solid running foundation. Jumping into ultra marathon training without adequate base fitness dramatically increases your injury risk and reduces your chances of finishing.</p>
      <p><strong>Minimum prerequisites before starting your ultra marathon training plan:</strong></p>
      <ul>
        <li><strong>Weekly mileage base:</strong> Consistently running 70+ km (45+ miles) per week for at least 6 months</li>
        <li><strong>Race experience:</strong> Completed at least one 50K or 50-mile race, ideally both</li>
        <li><strong>Long run history:</strong> Comfortable with 4+ hour long runs on varied terrain</li>
        <li><strong>Strength training:</strong> Regular hip, glute, and core work to handle ultra distances</li>
        <li><strong>Time commitment:</strong> 10-15 hours per week of training for 24-30 weeks</li>
      </ul>
      <p>If you're not quite there yet, consider a progressive approach: build to a 50K first, then a 50-miler, then tackle the 100-mile distance. Each step teaches you invaluable lessons about pacing, fueling, and mental toughness that feed into your eventual <strong>ultramarathon training plan</strong>.</p>

      <h2 id="ultra-marathon-training-plan-structure">Ultra Marathon Training Plan Structure</h2>
      <p>A proper <strong>ultra marathon training plan</strong> for 100 miles typically spans 24-30 weeks. This is significantly longer than a marathon build because your body needs more time to adapt to the extreme demands of running for 20-30+ hours straight.</p>
      <p><strong>Key components of a 100 mile training plan:</strong></p>
      <ul>
        <li><strong>Total duration:</strong> 24-30 weeks for experienced ultra runners, 30+ weeks if stepping up from marathon</li>
        <li><strong>Peak weekly volume:</strong> 120-160 km (75-100 miles), depending on experience</li>
        <li><strong>Long runs:</strong> Measured by time (3-7 hours), not distance — because ultra racing is about time on feet</li>
        <li><strong>Back-to-back long runs:</strong> Weekend pairings that simulate running on tired legs</li>
        <li><strong>Vertical training:</strong> Elevation-specific sessions for trail and mountain ultras</li>
        <li><strong>Fueling practice:</strong> Dedicated sessions to dial in race-day nutrition</li>
        <li><strong>Recovery weeks:</strong> Every 3-4 weeks to allow adaptation without overtraining</li>
      </ul>
      <p>The biggest mistake in <strong>ultra running training</strong> is trying to replicate marathon training at higher volume. Ultra training requires a fundamentally different approach — slower paces, longer time on feet, and a much greater emphasis on consistency over intensity.</p>

      <h2 id="periodization">Periodization for Ultra Distances</h2>
      <p>Effective <strong>ultra marathon training plans</strong> use true periodization — structured phases that systematically build your fitness toward peak performance on race day. Unlike shorter race training, ultra periodization includes race-specific phases that target the unique demands of 100 miles.</p>
      <p><strong>The 6 phases of a 100 mile ultra marathon training plan:</strong></p>
      
      <p><strong>1. Base Phase (6-8 weeks)</strong></p>
      <p>Build your aerobic foundation with consistent, easy-effort mileage. Focus on gradually increasing weekly volume while keeping intensity low. This phase establishes the cardiovascular and musculoskeletal base that everything else builds upon. Long runs start at 2-3 hours.</p>
      
      <p><strong>2. Build 1 Phase (4-6 weeks)</strong></p>
      <p>Introduce moderate-intensity workouts like tempo runs and sustained climbs. Weekly volume increases by 10-12% per week (with recovery weeks built in). Long runs extend to 3-4 hours. This is where your <strong>ultra running training</strong> begins to feel real.</p>
      
      <p><strong>3. Build 2 / Race-Specific Phase (4-6 weeks)</strong></p>
      <p>The most important phase of your <strong>ultramarathon training plan</strong>. This is where back-to-back long runs begin, fueling practice becomes a priority, and training mimics race-day conditions. If your race has significant elevation, this phase emphasizes vertical gain. Long runs reach 4-6 hours.</p>
      
      <p><strong>4. Peak Phase (2-3 weeks)</strong></p>
      <p>Your highest volume and longest runs occur here. Peak long runs reach 5-7 hours (50-60 km). Back-to-back weekends are at their most demanding, with the Saturday long run followed by a 60-70% effort on Sunday. This is the summit of your training — everything after this is recovery and sharpening.</p>
      
      <p><strong>5. Taper Phase (4-5 weeks for 100 miles)</strong></p>
      <p>Gradually reduce volume by 20% per week while maintaining some intensity. The 100-mile taper is longer than a marathon taper because the training stimulus is so much greater. Your body needs 4-5 weeks to fully absorb the training and arrive at the start line fresh.</p>
      
      <p><strong>6. Recovery Phase (2-3 weeks post-race)</strong></p>
      <p>Easy running and active recovery after the race. Many runners take 1-2 weeks completely off, then return to easy jogging. Full recovery from a 100-miler typically takes 4-8 weeks.</p>

      <h2 id="long-runs-and-back-to-back">Long Runs and Back-to-Back Training</h2>
      <p>The long run is the cornerstone of any <strong>ultra marathon training plan</strong>, but for 100-mile training, it takes on a unique form: <strong>back-to-back long runs</strong>.</p>
      
      <p><strong>Why back-to-back long runs matter:</strong></p>
      <p>In a 100-mile race, you'll spend 20-30+ hours on your feet. No single training run can replicate that fatigue. Back-to-back long runs — a long effort on Saturday followed by another long effort on Sunday — teach your body to perform on pre-fatigued legs. This is the closest you can get to simulating race conditions without actually racing.</p>
      
      <p><strong>How to structure back-to-back weekends in your ultra running training:</strong></p>
      <ul>
        <li><strong>Frequency:</strong> Every 2-3 weeks during the Build 2 and Peak phases</li>
        <li><strong>Saturday (primary):</strong> Your longest effort — 4-7 hours at easy, conversational pace</li>
        <li><strong>Sunday (secondary):</strong> 60-70% of Saturday's duration, starting slow and building if you feel good</li>
        <li><strong>Fueling:</strong> Practice your race-day nutrition during both runs</li>
        <li><strong>Terrain:</strong> Run on similar terrain to your target race whenever possible</li>
      </ul>
      
      <p><strong>Time-based long runs vs. distance-based:</strong></p>
      <p>Most experienced ultra coaches design long runs by time, not distance. A 5-hour long run on technical trail at 8:00/km pace covers very different ground than a 5-hour road run at 6:00/km pace — but the training stimulus (time on feet, metabolic demand, musculoskeletal stress) is similar. Your <strong>ultra marathon training plan</strong> should prescribe long runs in hours, especially if you're training on trails.</p>

      <h2 id="vertical-gain-training">Vertical Gain and Terrain-Specific Training</h2>
      <p>If your 100-mile race involves significant climbing — and most do — your <strong>ultramarathon training plan</strong> needs to include dedicated vertical gain training. Mountain ultras like UTMB, Western States, and Hardrock demand as much climbing fitness as running fitness.</p>
      
      <p><strong>How to incorporate vertical training:</strong></p>
      <ul>
        <li><strong>Weekly vert targets:</strong> Build from 1,000m/week in base phase to 3,000-5,000m/week in peak phase</li>
        <li><strong>Hill repeats:</strong> Short, steep climbs (200-400m gain) at threshold effort to build power</li>
        <li><strong>Sustained climbs:</strong> 45-90 minute continuous uphill efforts at easy-to-moderate effort</li>
        <li><strong>Downhill training:</strong> Practice fast, controlled descending to build quad resilience — downhills destroy your legs in a 100-miler</li>
        <li><strong>Power hiking:</strong> Train to hike efficiently at 4-5 km/h on steep terrain — you will hike significant portions of any mountain 100-miler</li>
        <li><strong>Pole practice:</strong> If your race allows trekking poles, train with them during long runs</li>
      </ul>
      <p>For road-based 100-milers, vertical training is less critical but still valuable. Even modest hills build strength and break up the repetitive motion that causes overuse injuries during flat ultra marathons.</p>

      <h2 id="fueling-strategy">Fueling Strategy for 100 Miles</h2>
      <p>Fueling is where 100-mile races are won or lost. Your <strong>100 mile training plan</strong> must include dedicated fueling practice sessions — you cannot figure out your nutrition strategy on race day.</p>
      
      <p><strong>The numbers:</strong></p>
      <ul>
        <li><strong>Caloric burn:</strong> 8,000-12,000 calories over 100 miles</li>
        <li><strong>Target intake:</strong> 200-300 calories per hour (you cannot replace all calories burned)</li>
        <li><strong>Carbohydrate goal:</strong> 60-90g of carbs per hour for optimal performance</li>
        <li><strong>Hydration:</strong> 500-800ml per hour, adjusted for heat and humidity</li>
        <li><strong>Sodium:</strong> 500-1000mg per hour to prevent hyponatremia</li>
      </ul>
      
      <p><strong>How to practice fueling during ultra marathon training:</strong></p>
      <ul>
        <li><strong>Start early:</strong> Begin fueling practice during Build 1 phase on long runs over 2 hours</li>
        <li><strong>Test everything:</strong> Gels, chews, real food (boiled potatoes, PB&J, rice balls), liquid calories</li>
        <li><strong>Simulate aid stations:</strong> Practice eating and drinking while moving at race pace</li>
        <li><strong>Night fueling:</strong> Practice eating when nauseous and tired — your appetite will crash during the race</li>
        <li><strong>Stomach training:</strong> Gradually increase caloric intake during training to train your gut</li>
        <li><strong>Record everything:</strong> Track what works and what doesn't — your race-day plan should be proven in training</li>
      </ul>
      <p>The golden rule of ultra fueling: <em>eat before you're hungry, drink before you're thirsty</em>. By the time you feel hungry or thirsty in a 100-miler, you're already behind and it's very hard to catch up.</p>

      <h2 id="mental-preparation">Mental Preparation for Ultra Running</h2>
      <p>The physical demands of a 100-mile race are enormous, but it's the mental challenge that separates finishers from DNFs. Your <strong>ultra marathon training plan</strong> should include deliberate mental preparation.</p>
      
      <p><strong>Mental strategies for ultra running:</strong></p>
      <ul>
        <li><strong>Segment the race:</strong> Break 100 miles into manageable chunks (aid station to aid station, not start to finish)</li>
        <li><strong>Embrace the low points:</strong> Everyone hits dark patches — the runners who finish are the ones who keep moving through them</li>
        <li><strong>Practice discomfort:</strong> Train in bad weather, run tired, do back-to-back long runs — get comfortable being uncomfortable</li>
        <li><strong>Visualization:</strong> Mentally rehearse key moments — arriving at aid stations, running through the night, crossing the finish line</li>
        <li><strong>Mantras:</strong> Develop personal phrases that anchor you when things get hard ("relentless forward progress," "one step at a time")</li>
        <li><strong>Crew and pacer strategy:</strong> Plan who will pace you and when — having a familiar face at mile 70 can be transformative</li>
      </ul>
      <p>Perhaps the most important mental skill in <strong>ultra running training</strong> is learning to separate pain from injury. Discomfort is guaranteed in a 100-miler. Knowing when it's safe to push through and when to stop requires experience — which is why building up through shorter ultra distances is so valuable.</p>

      <h2 id="tapering">Tapering for Your 100 Mile Race</h2>
      <p>The taper is one of the most misunderstood parts of a <strong>100 mile training plan</strong>. Many runners taper too short or not aggressively enough for ultra distances.</p>
      
      <p><strong>Ultra marathon taper guidelines:</strong></p>
      <ul>
        <li><strong>100-mile taper:</strong> 4-5 weeks (significantly longer than a marathon's 2-3 weeks)</li>
        <li><strong>Volume reduction:</strong> ~20% per week — so if peak week is 150 km, taper goes roughly 120 → 96 → 77 → 61 → race week</li>
        <li><strong>Maintain some intensity:</strong> Keep 1-2 short, moderate-effort sessions per week to stay sharp</li>
        <li><strong>Final long run:</strong> 3-4 weeks before race day, no longer than 2-3 hours</li>
        <li><strong>Race week:</strong> Very easy running, 30-40% of normal volume, with 2 full rest days before the race</li>
      </ul>
      <p>The taper is when all your training adaptations solidify. Trust the process — it's normal to feel sluggish and anxious during taper. That restless energy is your body storing up for race day. A well-executed taper can improve your race performance by 3-6%.</p>

      <h2 id="gear-and-equipment">Gear and Equipment Essentials</h2>
      <p>Your <strong>ultra marathon training plan</strong> should include gear testing well before race day. Nothing new on race day — this applies to every piece of equipment you carry.</p>
      
      <p><strong>Essential gear for a 100-mile race:</strong></p>
      <ul>
        <li><strong>Shoes:</strong> Have 2-3 pairs broken in and tested on long runs. Many runners swap shoes at mile 50-60 for fresh cushioning. Trail shoes need adequate grip and drainage.</li>
        <li><strong>Hydration:</strong> Handheld bottles, vest, or pack — test on long runs to prevent chafing</li>
        <li><strong>Lighting:</strong> High-quality headlamp (200+ lumens) plus a backup — you'll run through at least one full night</li>
        <li><strong>Clothing layers:</strong> Conditions change dramatically over 20-30 hours. Plan for heat, cold, rain, and wind.</li>
        <li><strong>Anti-chafe:</strong> Body Glide, Squirrel's Nut Butter, or petroleum jelly on every potential friction point</li>
        <li><strong>Drop bags:</strong> Pre-packed bags at key aid stations with fresh clothes, shoes, food, and supplies</li>
        <li><strong>Foot care:</strong> Extra socks, blister treatment supplies, and toe tape</li>
      </ul>

      <h2 id="race-day">Race Day Execution</h2>
      <p>All the training comes down to execution. Here's how to apply your <strong>ultramarathon training plan</strong> on race day:</p>
      
      <p><strong>Miles 0-30: Banking patience</strong></p>
      <p>Start slower than you think you should. Your goal is to arrive at mile 30 feeling fresh and controlled. Walk the uphills from the start — your legs will thank you later. Eat and drink on schedule, not by feel.</p>
      
      <p><strong>Miles 30-60: The real race begins</strong></p>
      <p>This is where discipline separates finishers from DNFs. Maintain your fueling schedule even as appetite fades. Keep your effort conversational. If you trained with back-to-back long runs, your body knows how to perform on tired legs — trust it.</p>
      
      <p><strong>Miles 60-80: The dark place</strong></p>
      <p>Almost everyone hits their lowest point somewhere in this stretch. Nausea, blisters, exhaustion, and self-doubt are normal. Keep moving, even if it's a slow walk. This is where your mental training pays off. Aid station to aid station. One step at a time.</p>
      
      <p><strong>Miles 80-100: Finding another gear</strong></p>
      <p>If you make it to mile 80, you will almost certainly finish. A remarkable thing happens in the final 20 miles — knowing the end is near unlocks energy you didn't know you had. Embrace the emotion. You're about to become a 100-mile finisher.</p>

      <h2 id="ai-training-plans">AI-Powered Ultra Marathon Training Plans</h2>
      <p>Building a <strong>100 mile training plan</strong> from scratch is complex — there are dozens of variables to balance across 24-30 weeks. That's where AI-powered training plans can help.</p>
      
      <p><strong>How RunAnalytics builds your ultra marathon training plan:</strong></p>
      <ul>
        <li><strong>True periodization:</strong> Automatically structures your plan into Base, Build, Race-Specific, Peak, Taper, and Recovery phases</li>
        <li><strong>Time-based long runs:</strong> Prescribes long runs by duration (not just distance), which is more appropriate for ultra training</li>
        <li><strong>Back-to-back scheduling:</strong> Intelligently places back-to-back long run weekends every 2-3 weeks during Build 2 and Peak phases</li>
        <li><strong>Vertical gain targets:</strong> Calculates weekly elevation targets based on your race terrain (road, trail, or mountain)</li>
        <li><strong>Fueling practice sessions:</strong> Marks specific long runs as fueling practice opportunities so you never show up to race day unprepared</li>
        <li><strong>Adaptive coaching:</strong> AI adjusts your plan based on how training is going — missed a week? The plan recalibrates. Feeling strong? It can push you further.</li>
        <li><strong>Phase explanations:</strong> Every week includes a "Why this week?" note explaining the training intent, so you understand the purpose behind each session</li>
      </ul>
      <p>Whether you're training for your first 50K or pushing toward a 100-mile buckle, an <strong>ultra marathon training plan</strong> built on real periodization science — not just a spreadsheet with increasing mileage — gives you the best chance of success. Start building your personalized plan today with RunAnalytics.</p>
    `
  }
];

export function getBlogPostBySlug(slug: string): BlogPostContent | undefined {
  return blogPosts.find(post => post.slug === slug);
}

export function getAllBlogPosts(): BlogPostContent[] {
  return blogPosts;
}
