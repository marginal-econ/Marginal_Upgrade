import fs from "fs";
import { createClient } from "@supabase/supabase-js";

if (fs.existsSync(".env")) {
  try {
    process.loadEnvFile(".env");
  } catch {}
}

const url = process.env.BACKEND_URL || "";
const pubKey = process.env.BACKEND_PUBLISHABLE_KEY || "";
const serviceKey = process.env.BACKEND_SERVICE_ROLE_KEY || "";

const client = createClient(url, pubKey);
const adminClient = createClient(url, serviceKey);

async function testTeacherFlow() {
  console.log("Generating link for kiruthika24@gmail.com...");
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: "kiruthika24@gmail.com",
  });

  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error("Failed to generate link:", linkErr?.message);
    return;
  }

  const { data: sessionData, error: sessionErr } = await client.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (sessionErr || !sessionData?.session?.access_token) {
    console.error("verifyOtp error:", sessionErr?.message);
    return;
  }

  const token = sessionData.session.access_token;
  console.log("Got access token for kiruthika. Length:", token.length);

  const authSupabase = createClient(url, pubKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data: claimsData } = await authSupabase.auth.getClaims(token);
  console.log("Kiruthika Claims:", {
    sub: claimsData?.claims?.sub,
    email: claimsData?.claims?.email,
    app_metadata: claimsData?.claims?.app_metadata,
    user_metadata: claimsData?.claims?.user_metadata,
  });

  const userId = claimsData?.claims?.sub!;

  // 1. Check getMe handler
  const { getMe } = await import("../src/lib/account.functions");
  // Simulate getMe with context
  const { supabaseAdmin } = await import("../src/integrations/backend/client.server");
  const { data: rolesRes } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (rolesRes ?? []).map(r => r.role);

  console.log("Kiruthika user_roles in DB:", roles);

  const isTeacherUser =
    roles.includes("teacher") ||
    claimsData?.claims?.user_metadata?.role === "teacher" ||
    claimsData?.claims?.app_metadata?.role === "teacher";

  console.log("Is recognized as teacher:", isTeacherUser);

  const { getUserSubscriptionDetails } = await import("../src/lib/subscription.server");
  const sub = await getUserSubscriptionDetails(
    adminClient,
    userId,
    claimsData?.claims?.email,
    claimsData?.claims
  );

  console.log("Kiruthika subscription & teacher status:", {
    role: isTeacherUser ? "teacher" : "student",
    isTeacher: sub.isTeacher,
    tierName: sub.tierName,
    isAdmin: sub.isAdmin,
  });
}

testTeacherFlow().then(() => process.exit(0)).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
