import { db } from "../server/db";
import { users, userCampaigns } from "../shared/schema";
import { eq, and, isNull, sql, not, inArray } from "drizzle-orm";

type UserSegment = "segment_a" | "segment_b" | "segment_c" | "segment_d" | null;

function computeUserSegment(user: {
  subscriptionPlan: string | null;
  stravaConnected: boolean | null;
  activationAt: Date | null;
  lastSeenAt: Date | null;
}): UserSegment {
  const isPaid = user.subscriptionPlan !== "free" && user.subscriptionPlan !== null;
  
  if (isPaid) {
    return null; // Paid users shouldn't be in drip campaigns
  }
  
  if (!user.stravaConnected) {
    return "segment_a";
  }
  
  if (!user.activationAt) {
    return "segment_b";
  }
  
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (user.lastSeenAt && new Date(user.lastSeenAt) < sevenDaysAgo) {
    return "segment_d";
  }
  
  return "segment_c";
}

async function backfillDripCampaigns() {
  console.log("=== Drip Campaign Backfill Script ===\n");

  // Get all users
  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      subscriptionPlan: users.subscriptionPlan,
      stravaConnected: users.stravaConnected,
      activationAt: users.activationAt,
      lastSeenAt: users.lastSeenAt,
    })
    .from(users);

  console.log(`Found ${allUsers.length} total users\n`);

  // Get all active campaigns
  const activeCampaigns = await db
    .select()
    .from(userCampaigns)
    .where(eq(userCampaigns.state, "active"));

  const userCampaignMap = new Map<number, typeof activeCampaigns[0]>();
  for (const campaign of activeCampaigns) {
    userCampaignMap.set(campaign.userId, campaign);
  }

  console.log(`Found ${activeCampaigns.length} active campaign enrollments\n`);

  // Stats tracking
  const stats = {
    usersWithNoCampaign: 0,
    enrolledNew: { segment_a: 0, segment_b: 0, segment_c: 0, segment_d: 0, skipped_paid: 0 },
    existingFixed: { a_to_b: 0, a_to_c: 0, a_to_d: 0, exited_paid: 0 },
    alreadyCorrect: 0,
  };

  // Process each user
  for (const user of allUsers) {
    const existingCampaign = userCampaignMap.get(user.id);
    const correctSegment = computeUserSegment(user);

    if (!existingCampaign) {
      // User has no campaign - enroll them
      stats.usersWithNoCampaign++;

      if (correctSegment === null) {
        // Paid user - don't enroll
        stats.enrolledNew.skipped_paid++;
        console.log(`[SKIP] User ${user.id} (${user.email}) - paid subscriber, no enrollment needed`);
      } else {
        // Enroll in correct segment
        await db.insert(userCampaigns).values({
          userId: user.id,
          campaign: correctSegment,
          state: "active",
          currentStep: 1,
          enteredAt: new Date(),
          updatedAt: new Date(),
        });
        stats.enrolledNew[correctSegment]++;
        console.log(`[ENROLL] User ${user.id} (${user.email}) -> ${correctSegment}`);
      }
    } else {
      // User has existing campaign - check if it needs fixing
      const currentCampaign = existingCampaign.campaign as UserSegment;

      if (correctSegment === null) {
        // User became paid - exit their campaign
        await db
          .update(userCampaigns)
          .set({
            state: "exited",
            exitedAt: new Date(),
            exitReason: "subscribed",
            updatedAt: new Date(),
          })
          .where(eq(userCampaigns.id, existingCampaign.id));
        stats.existingFixed.exited_paid++;
        console.log(`[EXIT] User ${user.id} (${user.email}) - now paid, exited from ${currentCampaign}`);
      } else if (currentCampaign === "segment_a" && correctSegment !== "segment_a") {
        // User is in segment_a but should be elsewhere - exit and re-enroll
        await db
          .update(userCampaigns)
          .set({
            state: "exited",
            exitedAt: new Date(),
            exitReason: "backfill_correction",
            updatedAt: new Date(),
          })
          .where(eq(userCampaigns.id, existingCampaign.id));

        // Create new campaign entry in correct segment
        await db.insert(userCampaigns).values({
          userId: user.id,
          campaign: correctSegment,
          state: "active",
          currentStep: 1,
          enteredAt: new Date(),
          updatedAt: new Date(),
        });

        if (correctSegment === "segment_b") stats.existingFixed.a_to_b++;
        if (correctSegment === "segment_c") stats.existingFixed.a_to_c++;
        if (correctSegment === "segment_d") stats.existingFixed.a_to_d++;

        console.log(`[FIX] User ${user.id} (${user.email}) - moved from segment_a to ${correctSegment}`);
      } else if (currentCampaign === correctSegment) {
        stats.alreadyCorrect++;
      }
    }
  }

  // Print summary
  console.log("\n=== BACKFILL SUMMARY ===\n");
  console.log(`Users with no campaign: ${stats.usersWithNoCampaign}`);
  console.log(`  - Enrolled in segment_a: ${stats.enrolledNew.segment_a}`);
  console.log(`  - Enrolled in segment_b: ${stats.enrolledNew.segment_b}`);
  console.log(`  - Enrolled in segment_c: ${stats.enrolledNew.segment_c}`);
  console.log(`  - Enrolled in segment_d: ${stats.enrolledNew.segment_d}`);
  console.log(`  - Skipped (paid): ${stats.enrolledNew.skipped_paid}`);
  console.log("");
  console.log(`Existing campaigns fixed:`);
  console.log(`  - segment_a -> segment_b: ${stats.existingFixed.a_to_b}`);
  console.log(`  - segment_a -> segment_c: ${stats.existingFixed.a_to_c}`);
  console.log(`  - segment_a -> segment_d: ${stats.existingFixed.a_to_d}`);
  console.log(`  - Exited (now paid): ${stats.existingFixed.exited_paid}`);
  console.log("");
  console.log(`Already correct: ${stats.alreadyCorrect}`);

  // Final verification query
  console.log("\n=== FINAL SEGMENT COUNTS ===\n");
  const finalCounts = await db
    .select({
      campaign: userCampaigns.campaign,
      count: sql<number>`count(*)`,
    })
    .from(userCampaigns)
    .where(eq(userCampaigns.state, "active"))
    .groupBy(userCampaigns.campaign);

  for (const row of finalCounts) {
    console.log(`${row.campaign}: ${row.count}`);
  }

  const totalActive = finalCounts.reduce((sum, row) => sum + Number(row.count), 0);
  console.log(`Total active: ${totalActive}`);
}

// Run the backfill
backfillDripCampaigns()
  .then(() => {
    console.log("\n✅ Backfill completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Backfill failed:", error);
    process.exit(1);
  });
