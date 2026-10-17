import fs from "fs";
import { createClient } from "@supabase/supabase-js";

if (fs.existsSync(".env")) {
  try {
    process.loadEnvFile(".env");
  } catch {}
}

const url = process.env.BACKEND_URL || process.env.SUPABASE_URL || "";
const serviceKey = process.env.BACKEND_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

const adminClient = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function checkKiruthika() {
  for (let page = 1; page <= 5; page++) {
    const { data } = await adminClient.auth.admin.listUsers({ page, perPage: 50 });
    if (!data?.users || data.users.length === 0) break;
    const match = data.users.find(u => u.email?.includes("kiruthika"));
    if (match) {
      console.log("MATCH FOUND:", {
        id: match.id,
        email: match.email,
        app_metadata: match.app_metadata,
        user_metadata: match.user_metadata,
      });
    }
  }
}

checkKiruthika().then(() => process.exit(0)).catch(err => {
  console.error(err.message);
  process.exit(1);
});
