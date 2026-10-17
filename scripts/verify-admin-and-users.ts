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

const supabase = createClient(
  process.env.BACKEND_URL!,
  process.env.VITE_BACKEND_PUBLISHABLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "marginal.econ.ai@gmail.com",
    password: "MarginalAdmin2026!",
  });

  if (error) {
    console.error("❌ Login failed:", error.message);
  } else {
    console.log("✅ Admin Login SUCCESS!");
    console.log("   User ID:", data.user.id);
    console.log("   Email:", data.user.email);
    console.log("   Access Token generated successfully.");
  }
}

main().catch(console.error);
