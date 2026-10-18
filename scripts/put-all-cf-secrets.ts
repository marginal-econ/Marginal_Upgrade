import fs from "fs";
import { execSync } from "child_process";

function getEnv() {
  const envText = fs.readFileSync(".env", "utf8");
  const env: Record<string, string> = {};
  for (const line of envText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const env = getEnv();

const secretsToSet: Record<string, string> = {
  BACKEND_SERVICE_ROLE_KEY: env.BACKEND_SERVICE_ROLE_KEY,
  SUPABASE_SECRET_KEY: env.SUPABASE_SECRET_KEY,
  MAILJET_API_KEY: env.MAILJET_API_KEY,
  MAILJET_SECRET_KEY: env.MAILJET_SECRET_KEY,
  WAITLIST_ADMIN_KEY: env.WAITLIST_ADMIN_KEY,
  WAITLIST_OTP_SECRET: env.WAITLIST_OTP_SECRET,
};

for (const [key, value] of Object.entries(secretsToSet)) {
  if (!value) {
    console.warn(`Skipping ${key} (no value found in .env)`);
    continue;
  }
  console.log(`Setting secret: ${key} (length: ${value.length})...`);
  try {
    execSync(`npx wrangler secret put ${key}`, {
      input: value,
      stdio: ["pipe", "inherit", "inherit"],
    });
    console.log(`✅ ${key} successfully set.`);
  } catch (err: any) {
    console.error(`❌ Failed to set ${key}:`, err.message);
  }
}

console.log("\nAll Cloudflare Worker secrets have been updated!");
