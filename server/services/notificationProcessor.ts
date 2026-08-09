import { storage } from "../storage";
import { emailService } from "./email";
import { sendPushToUser } from "./pushService";
import type { NotificationOutbox, User } from "@shared/schema";
import { isInQuietHours, nextQuietHoursEnd } from "./proactiveCoach";

interface ProcessingResult {
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
}

export async function processNotifications(limit = 50): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: [],
  };

  try {
    const pendingNotifications = await storage.getPendingNotifications(limit);
    console.log(`[NotificationProcessor] Found ${pendingNotifications.length} pending notifications`);

    for (const notification of pendingNotifications) {
      result.processed++;
      
      try {
        const user = await storage.getUser(notification.userId);
        if (!user) {
          await storage.markNotificationFailed(notification.id, "User not found");
          result.failed++;
          continue;
        }
        if (notification.respectQuietHours && isInQuietHours(user)) {
          await storage.rescheduleNotification(notification.id, nextQuietHoursEnd(user));
          console.log(`[NotificationProcessor] Deferred notification ${notification.id} until quiet hours end`);
          continue;
        }
        const isCoachMessage = ["activity_recap", "next_step", "weekly_summary", "plan_reminder", "morning_briefing", "daily_checkin", "missed_workout", "race_week"].includes(notification.type);
        if (isCoachMessage && (!user.coachEnabled || (user.coachSnoozedUntil && new Date(user.coachSnoozedUntil) > new Date()))) {
          await storage.markNotificationFailed(notification.id, "Coach paused or snoozed by runner");
          result.failed++;
          continue;
        }
        if (notification.channel === "email" && !user.email) {
          await storage.markNotificationFailed(notification.id, "User has no email address");
          result.failed++;
          continue;
        }

        if (notification.channel === "email") {
          const sendResult = await sendNotificationEmail(notification, user);
          if (sendResult.success) {
            await storage.markNotificationSent(notification.id);
            result.sent++;
            console.log(`[NotificationProcessor] Sent email notification ${notification.id} to ${user.email}`);
          } else {
            await storage.markNotificationFailed(notification.id, sendResult.reason || "Email sending failed");
            result.failed++;
            if (sendResult.reason === "email_not_configured") {
              console.log(`[NotificationProcessor] Email not configured - marked notification ${notification.id} as failed`);
            }
          }
        } else if (notification.channel === "in_app") {
          await storage.markNotificationSent(notification.id);
          result.sent++;
        } else if (notification.channel === "push") {
          const data = (notification.data as Record<string, unknown> | null) || {};
          const pushResult = await sendPushToUser(notification.userId, {
            title: notification.title,
            body: notification.body,
            url: (data.url as string) || (data.activityId ? `/activity/${data.activityId}` : "/dashboard"),
            tag: notification.dedupeKey || `notif-${notification.id}`,
            data,
          });
          if (pushResult.delivered > 0 || pushResult.attempted === 0) {
            // Mark sent even with no subscribers (user opted out) so we don't retry forever
            await storage.markNotificationSent(notification.id);
            result.sent++;
            console.log(`[NotificationProcessor] Push notification ${notification.id} → ${pushResult.delivered}/${pushResult.attempted} delivered`);
          } else {
            await storage.markNotificationFailed(notification.id, "All push deliveries failed");
            result.failed++;
          }
        } else {
          await storage.markNotificationFailed(notification.id, `Unsupported channel: ${notification.channel}`);
          result.failed++;
        }
      } catch (error: any) {
        const errorMessage = error?.message || "Unknown error";
        await storage.markNotificationFailed(notification.id, errorMessage);
        result.failed++;
        result.errors.push(`Notification ${notification.id}: ${errorMessage}`);
        console.error(`[NotificationProcessor] Error processing notification ${notification.id}:`, error);
      }
    }

    console.log(`[NotificationProcessor] Completed: ${result.sent} sent, ${result.failed} failed`);
    return result;
  } catch (error: any) {
    console.error("[NotificationProcessor] Fatal error:", error);
    result.errors.push(`Fatal: ${error?.message || "Unknown error"}`);
    return result;
  }
}

interface EmailSendResult {
  success: boolean;
  reason?: string;
}

async function sendNotificationEmail(
  notification: NotificationOutbox,
  user: User
): Promise<EmailSendResult> {
  if (!emailService.isConfigured()) {
    return { success: false, reason: "email_not_configured" };
  }

  const data = notification.data as Record<string, unknown> | null;
  let success = false;
  
  try {
    switch (notification.type) {
      case "activity_recap":
        success = await emailService.sendCoachRecapEmail(
          user.email!,
          user.username || user.email!.split("@")[0],
          {
            activityName: data?.activityName as string || "Your Run",
            recapBullets: (data as any)?.recapBullets || [notification.body],
            nextStep: data?.nextStep as string || "easy",
            recapId: data?.recapId as number,
            activityId: data?.activityId as number,
          }
        );
        break;
        
      case "weekly_summary":
        success = await emailService.sendEmail({
          to: user.email!,
          subject: notification.title,
          html: formatWeeklySummaryEmail(notification, user),
          text: notification.body,
        });
        break;
        
      case "plan_reminder":
        success = await emailService.sendEmail({
          to: user.email!,
          subject: notification.title,
          html: formatPlanReminderEmail(notification, user),
          text: notification.body,
        });
        break;

      case "morning_briefing":
      case "daily_checkin":
      case "missed_workout":
      case "race_week":
      case "next_step":
        success = await emailService.sendEmail({
          to: user.email!,
          subject: notification.title,
          html: formatCoachBriefEmail(notification, user),
          text: `${notification.title}\n\n${notification.body}\n\nOpen your coach: https://aitracker.run/dashboard\nManage coaching: https://aitracker.run/coach-settings`,
        });
        break;
        
      default:
        success = await emailService.sendEmail({
          to: user.email!,
          subject: notification.title,
          html: `<p>${notification.body}</p>`,
          text: notification.body,
        });
    }

    return { success, reason: success ? undefined : "send_failed" };
  } catch (error: any) {
    return { success: false, reason: error?.message || "unknown_error" };
  }
}

function formatWeeklySummaryEmail(notification: NotificationOutbox, user: User): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #e74c3c;">📊 Your Weekly Training Summary</h2>
      <p>Hey ${user.username || "Runner"}!</p>
      <p>${notification.body}</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://aitracker.run/dashboard" style="background: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Full Summary →</a>
      </div>
    </div>
  `;
}

function formatPlanReminderEmail(notification: NotificationOutbox, user: User): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #27ae60;">🏃 Training Plan Reminder</h2>
      <p>Hey ${user.username || "Runner"}!</p>
      <p>${notification.body}</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://aitracker.run/training-plans" style="background: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Your Plan →</a>
      </div>
    </div>
  `;
}

export const notificationProcessor = {
  processNotifications,
};

class NotificationDeliveryWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private running = false;

  start(): void {
    if (this.intervalId) return;
    const tick = async () => {
      if (this.running) return;
      this.running = true;
      try { await processNotifications(50); }
      catch (error) { console.error("[NotificationProcessor] Worker tick failed:", error); }
      finally { this.running = false; }
    };
    setTimeout(() => void tick(), 30_000);
    this.intervalId = setInterval(() => void tick(), 60_000);
    console.log("[NotificationProcessor] Delivery worker started — every minute");
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]!));
}

function formatCoachBriefEmail(notification: NotificationOutbox, user: User): string {
  const name = escapeHtml(user.firstName || user.username || "Runner");
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:28px;color:#263238;">
      <p style="margin:0 0 8px;color:#FC4C02;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">RunAnalytics Coach</p>
      <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;">${escapeHtml(notification.title)}</h1>
      <p style="font-size:16px;line-height:1.65;margin:0 0 24px;">Hi ${name} — ${escapeHtml(notification.body)}</p>
      <a href="https://aitracker.run/dashboard" style="display:inline-block;background:#FC4C02;color:white;text-decoration:none;border-radius:8px;padding:12px 18px;font-weight:700;">Open today’s coaching</a>
      <p style="margin-top:28px;font-size:12px;color:#777;line-height:1.5;">Training guidance, not medical advice. <a href="https://aitracker.run/coach-settings" style="color:#666;">Change timing, channel, weather, quiet hours, snooze or pause coaching</a>.</p>
    </div>`;
}

export const notificationDeliveryWorker = new NotificationDeliveryWorker();
