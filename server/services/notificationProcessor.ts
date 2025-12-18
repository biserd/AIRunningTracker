import { storage } from "../storage";
import { emailService } from "./email";
import type { NotificationOutbox, User } from "@shared/schema";

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
        if (!user || !user.email) {
          await storage.markNotificationFailed(notification.id, "User not found or no email");
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
