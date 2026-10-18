import { resetAllUserLimitsToBaseline } from "../src/lib/subscription.server";
import { supabaseAdmin } from "../src/integrations/backend/client.server";

async function main() {
  console.log("Starting reset of all user limits to baseline according to account tiers...");

  const result = await resetAllUserLimitsToBaseline(supabaseAdmin);
  console.log("Reset Result:", result);

  if (result.success) {
    console.log("✅ Successfully reset all user limits to baseline at:", result.resetAt);
  } else {
    console.error("❌ Reset failed:", result.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
