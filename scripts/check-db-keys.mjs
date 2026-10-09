import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

const envText = fs.readFileSync(".env", "utf8");
const env = {};
envText.split("\n").forEach((line) => {
  const [k, ...v] = line.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
});

const url = env.BACKEND_URL || env.SUPABASE_URL;
const key = env.BACKEND_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from("ai_provider_keys").select("id, provider, purpose, model, is_active, label");
  console.log("ai_provider_keys in DB:", data);
  if (error) console.error("Error:", error);
}

check();
