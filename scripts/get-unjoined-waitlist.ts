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

const URL = process.env.BACKEND_URL || process.env.SUPABASE_URL || "https://srukuuhxloxdukonmual.supabase.co";
const KEY = process.env.BACKEND_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

const sb = createClient(URL, KEY, { auth: { persistSession: false } });

async function checkDetails() {
  console.log("Analyzing Production Supabase:", URL);

  const { data: usersData, error: uErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
  if (uErr) {
    console.error("Error fetching auth users:", uErr);
    return;
  }

  const authUsers = usersData?.users || [];
  const userMap = new Map<string, any>();
  for (const u of authUsers) {
    if (u.email) {
      userMap.set(u.email.toLowerCase().trim(), u);
    }
  }

  const { data: codes, error: cErr } = await sb.from("waitlist_email_codes").select("*");
  console.log(`Total waitlist_email_codes: ${codes?.length ?? 0} (error: ${cErr?.message || "none"})`);
  if (codes && codes.length > 0) {
    console.log("Recent email codes:", codes.map(c => ({ email: c.email, created_at: c.created_at, consumed: c.consumed })));
    for (const c of codes) {
      const u = userMap.get(c.email.toLowerCase().trim());
      console.log(`Code email ${c.email}: in auth=${!!u}, lastSignIn=${u?.last_sign_in_at}`);
    }
  }

  const { data: waitlist, error: wlErr } = await sb
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: true });

  if (wlErr) {
    console.error("Error fetching waitlist:", wlErr);
    return;
  }

  console.log(`Total waitlist rows: ${waitlist.length}`);
  console.log(`Total auth.users: ${authUsers.length}`);

  const unconfirmedWaitlist: any[] = [];
  const activeWaitlist: any[] = [];
  const notInAuthWaitlist: any[] = [];

  for (const m of waitlist) {
    const emailKey = m.email.toLowerCase().trim();
    const authUser = userMap.get(emailKey);

    if (!authUser) {
      notInAuthWaitlist.push({ ...m, reason: "No auth.users record" });
    } else if (!authUser.last_sign_in_at && !authUser.email_confirmed_at) {
      unconfirmedWaitlist.push({
        ...m,
        userId: authUser.id,
        authCreated: authUser.created_at,
        invitedAt: authUser.invited_at,
        confirmedAt: authUser.email_confirmed_at,
        lastSignIn: authUser.last_sign_in_at,
      });
    } else {
      activeWaitlist.push({
        ...m,
        userId: authUser.id,
        authCreated: authUser.created_at,
        confirmedAt: authUser.email_confirmed_at,
        lastSignIn: authUser.last_sign_in_at,
      });
    }
  }

  console.log("\n========================================================");
  console.log(`WAITLIST CANDIDATES WHO HAVE NOT JOINED / NEVER SIGNED IN`);
  console.log(`Total: ${notInAuthWaitlist.length + unconfirmedWaitlist.length}`);
  console.log("========================================================\n");

  if (notInAuthWaitlist.length > 0) {
    console.log(`--- Group A: In waitlist table, BUT NO Supabase Auth user created (${notInAuthWaitlist.length}) ---`);
    notInAuthWaitlist.forEach((u, i) => {
      console.log(`${i + 1}. ${u.email} | Name: ${u.name || "N/A"} | Status: ${u.status} | City: ${u.city || "N/A"}`);
    });
    console.log();
  }

  console.log(`--- Group B: Waitlist users who were invited into Auth, but NEVER signed in / confirmed (${unconfirmedWaitlist.length}) ---`);
  unconfirmedWaitlist.forEach((u, i) => {
    console.log(`${i + 1}. ${u.email}`);
    console.log(`   Name: ${u.name || "N/A"} | City: ${u.city || "N/A"} | Country: ${u.country || "N/A"}`);
    console.log(`   Waitlist Status: ${u.status} | Auth Invited: ${u.invitedAt || "N/A"} | Last Sign In: ${u.lastSignIn || "Never"}`);
  });

  console.log("\n========================================================");
  console.log(`ACTIVE / JOINED WAITLIST MEMBERS (${activeWaitlist.length})`);
  console.log("========================================================");
  activeWaitlist.forEach((u, i) => {
    console.log(`${i + 1}. ${u.email} | Name: ${u.name || "N/A"} | Last sign in: ${u.lastSignIn || u.confirmedAt}`);
  });

  // Also check if there are other auth users who never signed in
  const nonWaitlistUnconfirmed: any[] = [];
  const waitlistEmails = new Set(waitlist.map((w) => w.email.toLowerCase().trim()));
  for (const u of authUsers) {
    if (u.email && !waitlistEmails.has(u.email.toLowerCase().trim())) {
      if (!u.last_sign_in_at && !u.email_confirmed_at) {
        nonWaitlistUnconfirmed.push(u);
      }
    }
  }

  if (nonWaitlistUnconfirmed.length > 0) {
    console.log("\n========================================================");
    console.log(`OTHER AUTH USERS (Not in waitlist table) WHO NEVER SIGNED IN (${nonWaitlistUnconfirmed.length})`);
    console.log("========================================================");
    nonWaitlistUnconfirmed.forEach((u, i) => {
      console.log(`${i + 1}. ${u.email} | Created: ${u.created_at} | Invited: ${u.invited_at || "N/A"}`);
    });
  }
}

checkDetails().then(() => process.exit(0)).catch(console.error);
