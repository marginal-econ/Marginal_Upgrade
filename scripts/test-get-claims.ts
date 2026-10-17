import fs from "fs";
import { createClient } from "@supabase/supabase-js";

if (fs.existsSync(".env")) {
  try {
    process.loadEnvFile(".env");
  } catch {}
}

const url = process.env.BACKEND_URL || "";
const key = process.env.BACKEND_PUBLISHABLE_KEY || "";
const supabase = createClient(url, key);

console.log("typeof supabase.auth.getClaims:", typeof (supabase.auth as any).getClaims);
console.log("typeof supabase.auth.getUser:", typeof supabase.auth.getUser);
