import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}
loadEnv();

const adminClient = createClient(
  process.env.BACKEND_URL!,
  process.env.BACKEND_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const pubClient = createClient(
  process.env.BACKEND_URL!,
  process.env.VITE_BACKEND_PUBLISHABLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  console.log("Testing invite generation...");
  const testEmail = "test_invite_verify@example.com";
  // Delete if exists
  const { data: existing } = await adminClient.auth.admin.listUsers();
  const found = existing?.users.find(u => u.email === testEmail);
  if (found) await adminClient.auth.admin.deleteUser(found.id);

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "invite",
    email: testEmail,
  });
  if (error || !data.properties?.hashed_token) {
    console.error("Invite error:", error);
    return;
  }
  const tokenHash = data.properties.hashed_token;
  console.log("Invite hashed token:", tokenHash);

  const { data: vData, error: vErr } = await pubClient.auth.verifyOtp({
    token_hash: tokenHash,
    type: "invite",
  });
  if (vErr) {
    console.error("❌ invite verifyOtp error:", vErr);
  } else {
    console.log("✅ invite verifyOtp SUCCESS!");
    console.log("   User:", vData.user?.email);
    console.log("   Session:", !!vData.session);
  }
  // cleanup
  if (vData?.user?.id) await adminClient.auth.admin.deleteUser(vData.user.id);
}

main().catch(console.error);
