import { Resend } from "resend";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
import * as schema from "../shared/schema";

const ADMIN_EMAIL = "biserd@gmail.com";
const isTest = process.argv.includes("--test");

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql, schema });

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = "Biser from RunAnalytics <noreply@aitracker.run>";

const subject = "RunAnalytics product update: Ultra plans, dual goals, Coach chat + Strava email cadence";

const textBody = `Hi everyone,

It's Biser from RunAnalytics with a quick product update.

Over the last few weeks, we've cleared up a number of small bugs and improved several existing features — including marathon pace prediction.

We're excited to share four newly released updates:

1. Ultra training plans (including 100-milers)

2. Primary + secondary goals so plans can adapt to competing priorities (e.g., half marathon + 50-miler)

3. Chat with our Running Coach and build/refine a training plan directly through chat

4. Strava webhook email cadence controls - members love getting instant feedback after posting runs, and you can now choose how frequently you want those emails

If you have any questions or want to request a feature, just reply to this email - I read every response.

See you on the roads (and trails),
Biser

RunAnalytics
P.S. Jump back in here: https://aitracker.run`;

const htmlBody = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
<p>Hi everyone,</p>

<p>It's Biser from RunAnalytics with a quick product update.</p>

<p>Over the last few weeks, we've cleared up a number of small bugs and improved several existing features — including marathon pace prediction.</p>

<p>We're excited to share four newly released updates:</p>

<p><strong>1. Ultra training plans (including 100-milers)</strong></p>

<p><strong>2. Primary + secondary goals</strong> so plans can adapt to competing priorities (e.g., half marathon + 50-miler)</p>

<p><strong>3. Chat with our Running Coach</strong> and build/refine a training plan directly through chat</p>

<p><strong>4. Strava webhook email cadence controls</strong> - members love getting instant feedback after posting runs, and you can now choose how frequently you want those emails</p>

<p>If you have any questions or want to request a feature, just reply to this email - I read every response.</p>

<p>See you on the roads (and trails),<br/>Biser</p>

<p>RunAnalytics<br/>P.S. Jump back in here: <a href="https://aitracker.run" style="color: #FC5200;">https://aitracker.run</a></p>
</div>`;

async function sendEmail(to: string): Promise<boolean> {
  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      replyTo: ADMIN_EMAIL,
      subject: isTest ? `[TEST] ${subject}` : subject,
      html: htmlBody,
      text: textBody,
    });
    return true;
  } catch (error) {
    console.error(`  Failed to send to ${to}:`, error);
    return false;
  }
}

async function main() {
  if (isTest) {
    console.log(`\n--- TEST MODE: Sending only to ${ADMIN_EMAIL} ---\n`);
    const success = await sendEmail(ADMIN_EMAIL);
    console.log(success ? `Sent test email to ${ADMIN_EMAIL}` : `Failed to send test email`);
    process.exit(0);
  }

  console.log("\n--- SENDING PRODUCT UPDATE TO ALL USERS ---\n");

  const users = await db
    .select({ id: schema.users.id, email: schema.users.email })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.marketingOptOut, false)
      )
    );

  console.log(`Found ${users.length} users (excluding marketing opt-outs)\n`);

  let sent = 0;
  let failed = 0;
  const batchSize = 5;
  const delayMs = 1500;

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map(async (user) => {
        const success = await sendEmail(user.email);
        if (success) {
          console.log(`  [${sent + failed + 1}/${users.length}] Sent to ${user.email}`);
        }
        return success;
      })
    );

    sent += results.filter(Boolean).length;
    failed += results.filter((r) => !r).length;

    if (i + batchSize < users.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.log(`\nDone! Sent: ${sent}, Failed: ${failed}, Total: ${users.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
