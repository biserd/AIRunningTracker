import { db } from "../server/db";
import { runningShoes } from "../shared/schema";
import { getEnrichedShoeData } from "../server/shoe-pipeline";

async function reseedShoes() {
  console.log("Clearing existing shoes...");
  await db.delete(runningShoes);
  
  console.log("Seeding new shoes...");
  const enrichedShoes = getEnrichedShoeData();
  
  let count = 0;
  for (const shoe of enrichedShoes) {
    await db.insert(runningShoes).values(shoe);
    count++;
  }
  
  console.log(`Successfully seeded ${count} shoes!`);
  process.exit(0);
}

reseedShoes().catch((err) => {
  console.error("Error reseeding shoes:", err);
  process.exit(1);
});
