/**
 * Automated Cloudflare Worker Secrets Synchronizer
 * Reads secrets safely from environment / .env and sets them via Cloudflare API.
 */
import fs from "fs";

if (fs.existsSync(".env")) {
  try {
    process.loadEnvFile(".env");
  } catch {}
}

const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "92f9a225db30843e51f045549a55017a";
const SCRIPT_NAME = "app";

async function setSecret(name: string, text: string) {
  if (!TOKEN) throw new Error("Missing CLOUDFLARE_API_TOKEN");
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT_NAME}/secrets`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, text, type: "secret_text" }),
  });
  const json: any = await res.json();
  if (json.success) {
    console.log(`✅ [Cloudflare Secret] ${name} updated successfully.`);
  } else {
    console.error(`❌ [Cloudflare Secret] ${name} failed:`, json.errors);
  }
}

async function run() {
  if (!TOKEN) {
    console.error("CLOUDFLARE_API_TOKEN not set");
    return;
  }
  const secrets: Record<string, string | undefined> = {
    BACKEND_SERVICE_ROLE_KEY: process.env.BACKEND_SERVICE_ROLE_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    MAILJET_API_KEY: process.env.MAILJET_API_KEY,
    MAILJET_SECRET_KEY: process.env.MAILJET_SECRET_KEY,
  };

  for (const [key, value] of Object.entries(secrets)) {
    if (value) {
      await setSecret(key, value);
    }
  }
}

run().catch(console.error);
