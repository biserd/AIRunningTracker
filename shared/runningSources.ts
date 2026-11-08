// Public product claims shared by landing pages, discovery and regression tests.
// Garmin's summary feed is deliberately separate from Strava-based coaching.
export const runningSources = {
  garmin: {
    name: 'Garmin Connect', path: '/garmin', label: 'Direct run sync · Optional recovery trends',
    title: 'Garmin Connect Running Sync | RunAnalytics',
    description: 'Connect Garmin for private run summaries and optional sleep, HRV and recovery trends. Explore setup, consent, supported metrics and current limits.',
    headline: 'Your Garmin runs. A direct connection.',
    intro: 'Keep recording on your Garmin. Bring new running summaries into a private RunAnalytics feed, and optionally review sleep and recovery trends, without routing them through Strava.',
    benefit: 'New run summaries, direct from Garmin Connect',
    summary: 'Direct new-run summaries, plus optional sleep, HRV and recovery trends with separate health consent. Manage your activity connection in web Settings.',
    destination: '/settings#garmin', cta: 'Connect Garmin in Settings',
    scope: 'Initial release: new run summaries and a separate opt-in health and sleep dashboard. No historical import through automatic sync. Garmin and eligible Strava runs appear together on your dashboard and in Activities; clear matches count once. Garmin data stays outside Runner Score, AI coaching and messaging.',
    steps: [
      { title: 'Sign in to RunAnalytics', text: 'Create an account or use your existing account. Open web Settings and find Garmin Connect.' },
      { title: 'Choose what you share', text: 'Review the activity-sharing consent, select Connect Garmin, and approve Activity Export on Garmin’s authorization screen.' },
      { title: 'Record and sync a new run', text: 'Sync your activity to Garmin Connect. Eligible new running summaries appear on your dashboard and in Activities after provider delivery. Review connection status in Settings.' },
    ],
    details: [
      { title: 'The essentials of your run', text: 'Distance, duration and average pace, plus heart rate, cadence, elevation gain and calories when supplied. Missing sensor fields stay missing, not estimated.' },
      { title: 'One view of your runs', text: 'See Garmin and eligible Strava runs together. Clear cross-service matches count once and show both sources. Source copies remain stored separately, and uncertain overlaps stay separate for review.' },
      { title: 'Controls close to your data', text: 'See sync status, export stored summaries, delete an imported summary or disconnect from web Settings. These controls do not delete your original Garmin activities.' },
    ],
    faqs: [
      { question: 'Do I need Strava to connect Garmin?', answer: 'No. The direct Garmin connection works independently. Create or sign in to a RunAnalytics account, then connect Garmin from web Settings.' },
      { question: 'Will my old Garmin activities be imported?', answer: 'No. This release receives new running summaries after you authorize activity sharing. Historical backfill and detailed activity-file import are not included.' },
      { question: 'Does Garmin power the AI coach or Runner Score?', answer: 'Not in this initial release. Garmin summaries contribute to basic run totals, trends and browsing. Strava remains the source for Runner Score, AI coaching and messaging; Garmin summaries do not enter those features.' },
      { question: 'Can I see Garmin sleep, HRV and Body Battery?', answer: 'Yes, optionally. After connecting Garmin and granting health sharing, review and accept the separate health notice on the Recovery page. Available sleep, HRV, resting heart rate, stress and Body Battery summaries appear there. Device support and new Garmin deliveries determine which readings are available. They do not enter AI coaching or messaging.' },
      { question: 'Are routes or planned workouts synced?', answer: 'No. GPS routes, detailed activity streams, workout uploads and course uploads to your watch are not included. The recovery dashboard does not generate a readiness score or medical advice.' },
      { question: 'Why is my Garmin feed empty?', answer: 'Check that Activity Export was granted and record a new run after connecting. Sync it to Garmin Connect, then check your status in web Settings. Delivery is not instant or guaranteed; contact support if it remains empty.' },
      { question: 'Can I use Garmin and Strava together?', answer: 'Yes. Your main dashboard and Activities list show Garmin and eligible Strava runs together. Clear matches based on start time, distance and duration count once and show both sources. Ambiguous overlaps stay separate. A matched run keeps its Strava analysis link, and each stored source copy remains independently controlled.' },
    ],
  },
  strava: {
    name: 'Strava', path: '/strava', label: 'Running history · Analytics & coaching',
    title: 'Strava Running Analytics & AI Coach | RunAnalytics',
    description: 'Turn synced Strava runs into training insights, Runner Score and AI coaching. Learn how to connect, sync and review the data behind your next run.',
    headline: 'Your Strava history. A clearer next run.',
    intro: 'Bring the running history you already record into RunAnalytics. Review your training, explore your progress and talk through your next step with an AI coach.',
    benefit: 'Your activity history, with more context',
    summary: 'Connect Strava for training analytics, Runner Score, race estimates and eligible Premium coaching. Available metrics depend on the data shared for each run.',
    destination: '/dashboard', cta: 'Open my running dashboard',
    scope: 'Strava is currently the source for connected analytics and coaching. Premium or an active trial is required to sync new runs and use paid coaching features; source fields and plan limits apply.',
    steps: [
      { title: 'Create or sign in to your account', text: 'Use the same RunAnalytics account across the web, WhatsApp connection and supported app experiences.' },
      { title: 'Authorize Strava and sync', text: 'Connect Strava from your dashboard and approve the required activity access. Use Sync to bring in the history available to your account and plan.' },
      { title: 'Find the useful pattern', text: 'Open a run, review your progress, or ask the coach about your training. An eligible trial or Premium subscription unlocks paid features.' },
    ],
    details: [
      { title: 'Understand a run', text: 'Review distance, pace, heart rate and elevation, with recorded splits and route data where available. Saved AI analysis gives eligible runs an additional layer of context.' },
      { title: 'See how training adds up', text: 'Review activity history, mileage trends, your activity calendar and Runner Score. Missing heart-rate, cadence or GPS data can limit individual metrics.' },
      { title: 'Ask a better follow-up', text: 'Use eligible voice or chat coaching to discuss your saved runs and goals. Connect WhatsApp separately in Settings to continue coaching there.' },
    ],
    faqs: [
      { question: 'Is RunAnalytics part of Strava?', answer: 'No. RunAnalytics is an independent service. You authorize access through Strava and can disconnect the connection in RunAnalytics Settings.' },
      { question: 'Can I keep recording with my Garmin watch?', answer: 'Yes. If your watch activities already sync to Strava, RunAnalytics can use the Strava copy through your authorized connection. The separate direct Garmin feed has a different, summary-only scope.' },
      { question: 'Why are some run metrics missing?', answer: 'RunAnalytics can only analyze the fields and streams supplied for that activity and your access level. Heart rate, cadence, route and split data are not present on every run.' },
      { question: 'Do I need Premium?', answer: 'Premium or an active trial is required for syncing new Strava runs and paid coaching. Manual calculators and public shoe research are available without connecting. See Pricing for current trial terms and access limits.' },
      { question: 'Can I use manual tools without connecting?', answer: 'Yes. Tools such as the race predictor, pacing and marathon-fueling calculators support manual entry. Connecting Strava is only needed for features that use your saved activity history.' },
      { question: 'Is coaching medical advice?', answer: 'No. Coaching and performance estimates are training guidance, not medical diagnosis, injury prevention or a guarantee of race performance.' },
    ],
  },
} as const;
export type RunningSource = keyof typeof runningSources;
