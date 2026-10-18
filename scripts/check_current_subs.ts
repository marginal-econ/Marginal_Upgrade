import { supabaseAdmin } from "../src/integrations/backend/client.server";

async function main() {
  const { data: subRows } = await supabaseAdmin
    .from("definitions")
    .select("id, term, category, definition_text")
    .ilike("term", "__USER_SUB_%");

  console.log("=== USER SUBSCRIPTIONS (" + (subRows?.length || 0) + ") ===");
  subRows?.forEach((r) => {
    console.log(r.term + " => " + r.definition_text);
  });

  const { data: upiRows } = await supabaseAdmin
    .from("definitions")
    .select("id, term, category, definition_text")
    .eq("category", "upi_payment_request");

  console.log("\n=== UPI REQUESTS (" + (upiRows?.length || 0) + ") ===");
  upiRows?.forEach((r) => {
    console.log(r.term + " => " + r.definition_text);
  });
}

main().catch(console.error);
