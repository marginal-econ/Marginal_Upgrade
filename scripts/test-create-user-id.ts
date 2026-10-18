import { createClient } from "@supabase/supabase-js";

const S2_URL = "https://srukuuhxloxdukonmual.supabase.co";
const S2_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNydWt1dWh4bG94ZHVrb25tdWFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg4MjY1MCwiZXhwIjoyMTA1NDU4NjUwfQ.65A0ejLXOuqjMeMKcX30gJr0h6LmtrF2JiR0P35tu_E";

const s2 = createClient(S2_URL, S2_KEY, { auth: { persistSession: false } });

async function testCreateUserWithId() {
  const testId = "00000000-0000-0000-0000-000000000001";
  const testEmail = "test_migration_user_id@example.com";

  // Check if test user exists and delete if so
  const { data: existing } = await s2.auth.admin.listUsers();
  const found = existing?.users.find((u) => u.email === testEmail);
  if (found) {
    await s2.auth.admin.deleteUser(found.id);
  }

  // Attempt creation with explicit ID
  const { data: created, error } = await s2.auth.admin.createUser({
    id: testId,
    email: testEmail,
    email_confirm: true,
    user_metadata: { test: true },
  });

  if (error) {
    console.log("Create user with ID error:", error.message);
  } else {
    console.log("Created user with ID:", created.user?.id);
    console.log("Did it match testId?", created.user?.id === testId);
    // Cleanup
    if (created.user?.id) {
      await s2.auth.admin.deleteUser(created.user.id);
      console.log("Cleaned up test user.");
    }
  }
}

testCreateUserWithId().then(() => process.exit(0)).catch(console.error);
