import { supabaseAdmin } from "../src/integrations/backend/client.server";
import {
  getUserSubscriptionDetails,
  resetAllUserLimitsToBaseline,
} from "../src/lib/subscription.server";
import { TIER_LIMITS, type PlanTier } from "../src/lib/usage-limits";

async function main() {
  console.log("=== RESETTING ALL PAID USERS & PLATFORM LIMITS TO NEW BASELINE ===");
  const now = new Date().toISOString();

  // 1. Reset platform global baseline
  const globalResult = await resetAllUserLimitsToBaseline(supabaseAdmin);
  console.log("Global baseline reset result:", globalResult);

  // 2. Fetch all user subscriptions in definitions
  const { data: subRows, error: subErr } = await supabaseAdmin
    .from("definitions")
    .select("id, term, category, definition_text")
    .ilike("term", "__USER_SUB_%");

  if (subErr) {
    console.error("Error reading subscriptions:", subErr);
  }

  const processedUserIds = new Set<string>();

  if (subRows) {
    for (const row of subRows) {
      try {
        const parsed = JSON.parse(row.definition_text);
        const userId = row.term.replace("__USER_SUB_", "");
        const tier: PlanTier = (parsed.tier || "foundation") as PlanTier;

        const updatedPayload = {
          ...parsed,
          tier,
          active: true,
          updatedAt: now,
          quotaResetAt: now,
        };

        await supabaseAdmin
          .from("definitions")
          .update({
            definition_text: JSON.stringify(updatedPayload),
            updated_at: now,
          })
          .eq("id", row.id);

        processedUserIds.add(userId);
        console.log(`✅ Reset subscription for ${row.term} to tier: ${tier} at ${now}`);
      } catch (e) {
        console.error(`Error updating ${row.term}:`, e);
      }
    }
  }

  // 3. Check approved UPI payments and ensure their sub is active and reset
  const { data: upiRows } = await supabaseAdmin
    .from("definitions")
    .select("definition_text")
    .eq("category", "upi_payment_request");

  if (upiRows) {
    for (const upi of upiRows) {
      try {
        const parsed = JSON.parse(upi.definition_text);
        if (parsed.status === "approved" && parsed.userId && parsed.tier) {
          const userId = parsed.userId;
          const tier: PlanTier = parsed.tier as PlanTier;
          const termKey = `__USER_SUB_${userId}`;

          const subPayload = {
            tier,
            active: true,
            utr: parsed.utr,
            updatedAt: now,
            quotaResetAt: now,
          };

          const { data: existing } = await supabaseAdmin
            .from("definitions")
            .select("id")
            .eq("term", termKey)
            .maybeSingle();

          if (existing?.id) {
            await supabaseAdmin
              .from("definitions")
              .update({
                definition_text: JSON.stringify(subPayload),
                updated_at: now,
              })
              .eq("id", existing.id);
          } else {
            await supabaseAdmin.from("definitions").insert({
              term: termKey,
              definition_text: JSON.stringify(subPayload),
              category: "user_subscription",
              source_label: "subscription_manager",
            });
          }

          // Update user auth metadata
          try {
            await supabaseAdmin.auth.admin.updateUserById(userId, {
              app_metadata: { tier },
              user_metadata: { tier },
            });
          } catch {}

          processedUserIds.add(userId);
          console.log(`✅ Confirmed approved UPI payer ${userId} (${parsed.userEmail}) reset on ${tier}`);
        }
      } catch (e) {
        console.error("Error processing upi row:", e);
      }
    }
  }

  // 4. Verify the active state and fresh limits for each user
  console.log("\n=== VERIFYING RESOLVED LIMITS FOR PAID USERS ===");
  for (const userId of processedUserIds) {
    const details = await getUserSubscriptionDetails(supabaseAdmin, userId);
    console.log(`User ${userId}:`, {
      tier: details.tier,
      tierName: details.tierName,
      isPaid: details.isPaid,
      essaysLimit: details.essaysLimit,
      essaysRemaining: details.essaysRemaining,
      liveExaminerCredits: details.liveExaminerCredits,
      canGradeEssay: details.canGradeEssay,
      canUseLiveExaminer: details.canUseLiveExaminer,
    });
  }

  console.log("\n🎉 ALL PAID USERS & SYSTEM LIMITS SUCCESSFULLY RESET TO NEW BASELINE!");
}

main().catch(console.error);
