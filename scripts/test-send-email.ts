import { createClient } from "@supabase/supabase-js";

const TARGET_URL = "https://tmuhpnorjydfijjotvoc.supabase.co";
const TARGET_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtdWhwbm9yanlkZmlqam90dm9jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjIwOTQyNywiZXhwIjoyMTA3Nzg1NDI3fQ.WXBjD-Z797BZmO5D8i7NFHOm-1LhsRxuZm0wYSBitaw";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkcWFma2ZteHBla3V0aWNucG9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MzU0NzUsImV4cCI6MjEwMzExMTQ3NX0.xmsEv51PffYP-7hGfAD3buv8BHML56eJFHgp024Ep8k";

const supabaseAdmin = createClient(TARGET_URL, TARGET_KEY, {
  auth: { persistSession: false },
});

async function run() {
  const email = "saikrish.econ@gmail.com";
  console.log(`Testing email delivery to ${email} via Supabase Auth...`);

  // Try sending an OTP / Magic Link email directly via Supabase Auth
  const { data, error } = await supabaseAdmin.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: "https://app.marginal-econ.workers.dev/auth",
    },
  });

  if (error) {
    console.error("❌ Supabase Auth signInWithOtp error:", error);
  } else {
    console.log("✅ Supabase Auth signInWithOtp succeeded! Email dispatched to inbox:", email);
  }

  const generated = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: "https://app.marginal-econ.workers.dev/auth",
    },
  });

  let link = generated.data?.properties?.action_link;
  if (link && (link.includes("redirect_to=http%3A%2F%2Flocalhost%3A3000") || link.includes("redirect_to=http://localhost:3000"))) {
    link = link
      .replace("redirect_to=http%3A%2F%2Flocalhost%3A3000", `redirect_to=${encodeURIComponent("https://app.marginal-econ.workers.dev/auth")}`)
      .replace("redirect_to=http://localhost:3000", `redirect_to=${encodeURIComponent("https://app.marginal-econ.workers.dev/auth")}`);
  }
  console.log("\n🔗 Direct Magic Login Link (for testing in browser):");
  console.log(link);
}

run().catch(console.error);
