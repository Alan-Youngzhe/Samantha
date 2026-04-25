/**
 * Seed script — writes demo shop reviews to Supabase via POST /api/reviews
 * Usage: npx tsx scripts/seed.ts
 */

import { allSeedReviews } from "../src/lib/seed-shops";

const API_URL = process.env.API_URL || "http://localhost:3000/api/reviews";

async function main() {
  const reviews = allSeedReviews;
  console.log(`🌱 Seeding ${reviews.length} reviews to ${API_URL}`);

  let ok = 0;
  let fail = 0;

  for (const r of reviews) {
    try {
      const body = {
        storeName: r.storeName,
        storeLocation: r.storeLocation,
        productName: r.productName,
        category: r.category,
        price: r.price,
        sentiment: r.sentiment,
        comment: r.comment,
        motive: r.motive,
        motiveConfidence: r.motiveConfidence,
        lat: r.lat,
        lng: r.lng,
        hour: r.hour,
        dayOfWeek: r.dayOfWeek,
        trustContext: {
          totalConversations: 5 + Math.floor(Math.random() * 20),
          totalSpendings: 2 + Math.floor(Math.random() * 10),
          totalPatterns: Math.floor(Math.random() * 5),
          totalCommitments: Math.floor(Math.random() * 3),
          triggerChainCount: Math.floor(Math.random() * 3),
          accountAgeDays: 10 + Math.floor(Math.random() * 60),
          hasMatchingSpending: Math.random() > 0.3,
          hasLocationMatch: true,
        },
      };

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        ok++;
        process.stdout.write(".");
      } else {
        fail++;
        const text = await res.text();
        console.error(`\n✗ ${r.storeName}: ${res.status} ${text}`);
      }
    } catch (e) {
      fail++;
      console.error(`\n✗ ${r.storeName}: ${e}`);
    }
  }

  console.log(`\n✅ Done: ${ok} ok, ${fail} failed`);
  console.log(
    `\nℹ️  Unknown stores (8) are pin-only — they don't have reviews.` +
    `\n   They will show as gray '?' pins on the map via the explore page fallback.`
  );
}

main();
