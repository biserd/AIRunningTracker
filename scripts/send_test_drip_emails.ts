import { emailService } from "../server/services/email";

const ADMIN_EMAIL = "biserd@gmail.com";
const BASE_URL = "https://aitracker.run";

const ALL_EMAILS = [
  // Segment A
  { step: "A1", segment: "segment_a", subject: "Start your free 14-day Premium trial", previewText: "Connect Strava to unlock AI coaching and personalized insights", ctaText: "Start My Free Trial", ctaUrl: "/auth?tab=signup&connect=strava&source=emailA1" },
  { step: "A2", segment: "segment_a", subject: "Your AI running coach is waiting", previewText: "30 seconds to connect Strava and get personalized training insights", ctaText: "Connect Strava Now", ctaUrl: "/auth?tab=signup&connect=strava&source=emailA2" },
  { step: "A3", segment: "segment_a", subject: "Don't miss out on free Premium features", previewText: "Your 14-day trial includes AI coaching, race predictions, and training plans", ctaText: "Claim My Free Trial", ctaUrl: "/auth?tab=signup&connect=strava&source=emailA3" },
  // Segment B
  { step: "B1", segment: "segment_b", subject: "Your Runner Score is ready", previewText: "See your personalized performance analysis", ctaText: "View My Runner Score", ctaUrl: "/dashboard?source=B1" },
  { step: "B2", segment: "segment_b", subject: "Meet your AI Running Coach", previewText: "Ask anything about your training - your coach knows your data", ctaText: "Chat with Coach", ctaUrl: "/chat?source=B2" },
  { step: "B3", segment: "segment_b", subject: "Your last run, analyzed", previewText: "See AI insights, effort breakdown, and coaching tips", ctaText: "View Run Analysis", ctaUrl: "/activities?source=B3" },
  { step: "B4", segment: "segment_b", subject: "Your personalized training plan is ready", previewText: "AI-generated plan based on your goals and fitness level", ctaText: "See My Training Plan", ctaUrl: "/training-plans?source=B4" },
  { step: "B5", segment: "segment_b", subject: "Halfway through your trial - here's what you've unlocked", previewText: "See your progress and the Premium features helping you improve", ctaText: "View My Progress", ctaUrl: "/dashboard?source=B5" },
  { step: "B6", segment: "segment_b", subject: "Your race predictions are in", previewText: "See estimated finish times for 5K, 10K, half marathon, and marathon", ctaText: "View Race Predictions", ctaUrl: "/race-predictor?source=B6" },
  { step: "B7", segment: "segment_b", subject: "Your Premium trial ends in 2 days", previewText: "Keep your AI coach, training plans, and unlimited insights", ctaText: "Continue Premium", ctaUrl: "/settings?tab=subscription&source=B7" },
  // Segment C
  { step: "C1", segment: "segment_c", subject: "We miss you! Your running insights are waiting", previewText: "See what's new since your last visit", ctaText: "View My Dashboard", ctaUrl: "/dashboard?source=C1" },
  { step: "C2", segment: "segment_c", subject: "New feature: AI activity recaps", previewText: "Get personalized coaching after every run", ctaText: "Try It Now", ctaUrl: "/activities?source=C2" },
  { step: "C3", segment: "segment_c", subject: "Your training insights are piling up", previewText: "Your AI coach has new recommendations for you", ctaText: "See Recommendations", ctaUrl: "/chat?source=C3" },
  { step: "C4", segment: "segment_c", subject: "Come back and see what's improved", previewText: "New features: better race predictions, smarter training plans", ctaText: "Explore New Features", ctaUrl: "/dashboard?source=C4" },
];

async function sendTestEmails() {
  console.log("Sending test emails to", ADMIN_EMAIL);
  
  for (const email of ALL_EMAILS) {
    try {
      await emailService.sendDripEmail({
        to: ADMIN_EMAIL,
        subject: `[TEST ${email.step}] ${email.subject}`,
        previewText: email.previewText,
        ctaText: email.ctaText,
        ctaUrl: BASE_URL + email.ctaUrl,
        userName: "Test Runner",
        step: email.step,
        campaign: email.segment,
      });
      console.log(`✓ Sent ${email.step}: ${email.subject}`);
      // Small delay between emails
      await new Promise(r => setTimeout(r, 500));
    } catch (error) {
      console.error(`✗ Failed ${email.step}:`, error);
    }
  }
  
  console.log("Done! Sent", ALL_EMAILS.length, "test emails");
}

sendTestEmails();
