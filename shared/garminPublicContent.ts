// Public, non-personal product information. Keep separate from private health APIs.
export const garminPublicPages = {
  recovery: {
    path: '/garmin/recovery',
    title: 'Garmin HRV, Sleep & Recovery Dashboard | RunAnalytics',
    description: 'Explore Garmin sleep, overnight HRV and recovery trends in a private dashboard. See supported readings, personal baselines, consent and privacy controls.',
    label: 'Garmin recovery dashboard',
    headline: 'See the nights behind your running days.',
    intro: 'Bring available Garmin sleep and recovery summaries into a private web dashboard. Review changes over time alongside your own baseline, without turning one wearable reading into a training verdict.',
    sections: [
      { id: 'metrics', title: 'What can you see from Garmin?', items: [
        { title: 'Sleep duration, stages and score', text: 'Review available nightly sleep totals, stages, awake time and Garmin sleep scores. A missing night stays blank. Tentative sleep is labeled rather than treated as a complete night.' },
        { title: 'Overnight HRV', text: 'See available overnight heart rate variability summaries and how they change across nights. Your personal baseline provides context; the dashboard does not reproduce Garmin HRV Status or diagnose a cause for a change.' },
        { title: 'Resting heart rate, stress and Body Battery', text: 'Review the available summary readings supplied by your supported Garmin device. Body Battery shows a reported level and its observation time, not a reconstructed all-day chart or a new readiness score.' },
      ] },
      { id: 'trends', title: 'A trend is more useful than an isolated number', items: [
        { title: 'Choose a 7- or 28-day view', text: 'Use a short window to review the past week, or a longer window to see a broader pattern. Each metric keeps its own observation date. Older readings are labeled, and gaps are not filled with estimates.' },
        { title: 'Build your own baseline', text: 'Where supported, personal baselines use the median of distinct prior Garmin dates within 14 days. At least seven valid dates are needed, and the latest day is excluded. A new connection may need time to collect enough readings.' },
        { title: 'Keep the interpretation in context', text: 'Wearable estimates are not medical advice, injury predictions or permission to train. The dashboard helps you review your records; it does not tell you that a particular HRV or sleep score guarantees recovery.' },
      ] },
      { id: 'privacy', title: 'Separate permission. Clear controls.', items: [
        { title: 'Health sharing is optional', text: 'Connecting Garmin activity sharing does not automatically enable health sharing. Grant the relevant Garmin permission, then review and accept the separate health and sleep notice on the Recovery page.' },
        { title: 'Private, with a limited retention window', text: 'Stored health summaries are retained for up to 90 days. You can export your stored summaries or stop health sync and delete imported health data. These controls do not delete your original records in Garmin Connect.' },
        { title: 'Not sent to the AI coach', text: 'Garmin health summaries and their derived trends stay outside AI coaching, WhatsApp, coaching emails and Strava. This page describes a private dashboard, not an AI health-analysis service.' },
      ] },
    ],
    faqs: [
      { question: 'Do I need Strava for the Garmin recovery dashboard?', answer: 'No. Garmin recovery sharing works independently of Strava. Sign in to RunAnalytics, connect Garmin from web Settings, and enable the separate health sharing on Recovery.' },
      { question: 'Will my previous sleep and HRV history appear automatically?', answer: 'No. Automatic historical backfill is not included in the current Garmin connection. New summaries arrive after the relevant permissions and consent are enabled. Do not expect a full baseline immediately after connecting.' },
      { question: 'Why are some Garmin recovery metrics missing?', answer: 'Readings depend on your device, sensors, wear time, granted permissions and Garmin deliveries. Sleep and overnight HRV may require wearing and syncing a supported device overnight. Missing readings stay missing rather than being estimated.' },
      { question: 'Can the coach use my Garmin sleep or HRV?', answer: 'Not currently. These health readings and derived trends are kept outside AI coaching and messaging. Strava remains the separate source for connected running analytics and eligible coaching.' },
    ],
  },
  setup: {
    path: '/garmin/setup',
    title: 'Connect Garmin: Setup & Sync Guide | RunAnalytics',
    description: 'Connect Garmin to RunAnalytics step by step. Enable run summaries, optionally share sleep and HRV, and troubleshoot missing activities or recovery readings.',
    label: 'Garmin Connect setup guide',
    headline: 'Connect Garmin. Know what happens next.',
    intro: 'Keep recording with your Garmin and syncing to Garmin Connect. Follow this guide to bring new running summaries into RunAnalytics, with optional sleep and recovery sharing as a separate choice.',
    sections: [
      { id: 'connect', title: 'Set up your Garmin running connection', items: [
        { title: '1. Choose your account path', text: 'New to RunAnalytics? The Connect with Garmin option on the sign-in page supports account creation after you review sharing, terms and privacy. If you already have an email or Strava account, sign in to that account first and link Garmin in web Settings to keep your data together. Existing Garmin-linked users can return with Connect with Garmin.' },
        { title: '2. Review activity sharing', text: 'Read the activity-sharing notice and select Agree to Garmin activity sharing. Then choose Connect Garmin. You will be taken to Garmin’s official authorization screen; enter your Garmin credentials only there.' },
        { title: '3. Approve Activity Export', text: 'Approve the activity permission on Garmin’s screen and return to RunAnalytics. Check the connection status in Settings. If you cancel or decline the required permission, the activity connection cannot be completed.' },
        { title: '4. Record and sync a new run', text: 'Record a new run after connecting, then sync your device to Garmin Connect. Eligible new running summaries appear on Dashboard and in Activities after Garmin delivers them. Settings also shows Recent Garmin runs and connection status. Delivery is not instant or guaranteed.' },
      ] },
      { id: 'health', title: 'Optionally add sleep and recovery trends', items: [
        { title: 'Grant health permission separately', text: 'Allow the relevant Garmin health permission for the connection. Open Recovery in RunAnalytics, review the separate health and sleep notice, and select Agree to Garmin health and sleep sharing. Activity consent alone is not enough.' },
        { title: 'Wear and sync your supported device', text: 'Available sleep, overnight HRV, resting heart rate, stress and Body Battery summaries depend on device support and Garmin delivery. Overnight readings may require wearing the device while sleeping. New accounts need enough valid nights before a personal baseline appears.' },
      ] },
      { id: 'troubleshooting', title: 'If your Garmin data has not appeared', items: [
        { title: 'The connection did not finish', text: 'Return to web Settings and check Garmin status. If necessary, retry Connect Garmin and finish the official consent screen. If you contact support, describe the step that failed; never send an authorization code, password or access token.' },
        { title: 'A new run is missing', text: 'First check that the run is visible in Garmin Connect, that Activity Export was granted, and that it was recorded after authorization. Then check the connection status and Recent Garmin runs in RunAnalytics. Repeatedly disconnecting is not a historical import or a guaranteed sync repair.' },
        { title: 'Older runs are missing', text: 'The current direct connection receives new run summaries, not automatic historical backfill. Reconnecting will not import your old Garmin history. Strava history, where separately authorized and available to your plan, follows a different sync workflow.' },
        { title: 'Sleep or HRV is missing', text: 'Check both Garmin health permission and the separate RunAnalytics health consent. Wear and sync a supported device and inspect the observation dates. Run summaries arriving does not mean that every health metric is available.' },
        { title: 'The feed stays empty', text: 'If the checks above do not resolve it, contact RunAnalytics support with the approximate run date, timezone and connection status. Hide sensitive details in screenshots. Do not send full health exports or OAuth callback links.' },
      ] },
      { id: 'limits', title: 'Know the boundaries before connecting', items: [
        { title: 'Summaries, not a watch-workout service', text: 'Distance, duration and average pace are shown, with heart rate, cadence, elevation and calories when supplied. GPS routes, detailed activity streams, course uploads and planned workouts sent to your watch are not included.' },
        { title: 'Garmin and Strava have different roles', text: 'Garmin and eligible Strava runs appear together in basic dashboard totals, trends, the activity calendar and Activities. Clear cross-service matches count once and show both sources; uncertain overlaps stay separate. Stored source copies are not merged. Garmin summaries remain outside Runner Score, AI coaching and messaging.' },
        { title: 'You can stop sharing', text: 'Review status, export or delete stored Garmin summaries, and disconnect from web Settings. Recovery also has health export and stop/delete controls. Deleting an imported summary does not delete the original in Garmin Connect.' },
      ] },
    ],
    faqs: [
      { question: 'Can I create an account or sign in with Garmin?', answer: 'Yes. Choose Connect with Garmin on the RunAnalytics sign-in page and review the sharing notice. If you already use RunAnalytics through email or Strava, sign in to your existing account first and link Garmin in Settings instead of creating another account. Health sharing remains a separate opt-in.' },
      { question: 'Does connecting Garmin require Strava?', answer: 'No. Direct Garmin run summaries and optional recovery sharing work independently. Strava is a separate connection for history-based analytics and eligible coaching.' },
      { question: 'Will disconnecting and reconnecting restore my old runs?', answer: 'No. The current direct Garmin integration does not automatically backfill previous activities. Check permissions, the date of the run and Garmin Connect sync before reconnecting.' },
      { question: 'Where can I get help with a missing sync?', answer: 'Use the RunAnalytics Contact page after checking the troubleshooting steps above. Include the approximate activity time, timezone and visible connection status, but do not share credentials, tokens or authorization links.' },
    ],
  },
} as const;
export type GarminPublicPage = keyof typeof garminPublicPages;
