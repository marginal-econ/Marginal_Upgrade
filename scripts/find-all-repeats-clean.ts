import { supabaseAdmin } from "../src/integrations/backend/client.server";

async function main() {
  const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const users = data?.users || [];

  console.log(`Total users in auth.users: ${users.length}`);

  // Identify duplicate individuals:
  // 1. Same person with Gmail + school email
  // 2. Same person with multiple Gmails
  const people = new Map<string, any[]>();

  for (const u of users) {
    const email = (u.email || "").toLowerCase();
    const name = (u.user_metadata?.full_name || u.user_metadata?.name || "").toLowerCase().trim();
    
    // Key by simplified clean name
    const cleanName = name.replace(/[^a-z]/g, "");
    if (cleanName) {
      if (!people.has(cleanName)) people.set(cleanName, []);
      people.get(cleanName)!.push({ email: u.email, id: u.id, name, created_at: u.created_at });
    }
  }

  console.log("\n=== Users sharing the same or very similar names ===");
  for (const [name, list] of people.entries()) {
    if (list.length > 1) {
      console.log(`\nPerson: "${name}" (${list.length} accounts):`);
      for (const item of list) {
        const { count } = await supabaseAdmin.from("essays").select("id", { count: "exact", head: true }).eq("user_id", item.id);
        console.log(`  - ${item.email} (id: ${item.id}, essays: ${count || 0}, created: ${item.created_at})`);
      }
    }
  }

  // Also check if any email has a duplicate in waitlist table
  const { data: waitlist } = await supabaseAdmin.from("waitlist").select("*");
  console.log(`\nTotal waitlist entries: ${waitlist?.length || 0}`);
  
  // Find names in waitlist that appear more than once
  const wlPeople = new Map<string, any[]>();
  for (const w of waitlist || []) {
    const cleanName = (w.name || "").toLowerCase().replace(/[^a-z]/g, "");
    if (cleanName) {
      if (!wlPeople.has(cleanName)) wlPeople.set(cleanName, []);
      wlPeople.get(cleanName)!.push(w);
    }
  }

  console.log("\n=== Waitlist names appearing more than once ===");
  for (const [name, list] of wlPeople.entries()) {
    if (list.length > 1) {
      console.log(`\nWaitlist person: "${name}" (${list.length} entries):`);
      for (const item of list) {
        console.log(`  - ${item.email} (status: ${item.status})`);
      }
    }
  }
}

main().catch(console.error);
