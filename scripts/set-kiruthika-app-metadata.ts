import fs from "fs";
import { createClient } from "@supabase/supabase-js";

if (fs.existsSync(".env")) {
  try {
    process.loadEnvFile(".env");
  } catch {}
}

const url = process.env.BACKEND_URL || "";
const serviceKey = process.env.BACKEND_SERVICE_ROLE_KEY || "";
const adminClient = createClient(url, serviceKey);

async function run() {
  const kiruthikaId = "ceefe050-d868-41c6-82ab-16d63fda9c01";
  const { data, error } = await adminClient.auth.admin.updateUserById(kiruthikaId, {
    app_metadata: { role: "teacher" },
  });
  console.log("Updated kiruthika app_metadata:", {
    id: data?.user?.id,
    email: data?.user?.email,
    app_metadata: data?.user?.app_metadata,
    error: error?.message,
  });
}

run().then(() => process.exit(0)).catch(console.error);
