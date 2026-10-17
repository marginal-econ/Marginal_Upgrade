/**
 * Automated Cloudflare Worker Secrets Synchronizer
 * Updates production secrets on Cloudflare Worker 'marginal' under Marginal.econ.ai@gmail.com
 */

const TOKEN = "cfut_CKWr1g87FEg78AriwxXeIzQgGIkunE9OMLyzdVtg04c39b0c";
const ACCOUNT_ID = "92f9a225db30843e51f045549a55017a";
const SCRIPT_NAME = "app";

const SECRETS_TO_SET: Record<string, string> = {
  BACKEND_URL: "https://tmuhpnorjydfijjotvoc.supabase.co",
  VITE_BACKEND_URL: "https://tmuhpnorjydfijjotvoc.supabase.co",
  SUPABASE_URL: "https://tmuhpnorjydfijjotvoc.supabase.co",
  BACKEND_PUBLISHABLE_KEY: "sb_publishable_OjodijuvlKGW8FBiuSZU7g_EUggDP77",
  VITE_BACKEND_PUBLISHABLE_KEY: "sb_publishable_OjodijuvlKGW8FBiuSZU7g_EUggDP77",
  BACKEND_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtdWhwbm9yanlkZmlqam90dm9jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjIwOTQyNywiZXhwIjoyMTA3Nzg1NDI3fQ.WXBjD-Z797BZmO5D8i7NFHOm-1LhsRxuZm0wYSBitaw",
  SUPABASE_SECRET_KEY: "sb_secret_0B-RiFaTdebT4xu4lnfE3w_Zf1qI2U_",
};

async function setSecret(name: string, text: string) {
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
  console.log(`🔒 Synchronizing secrets for Cloudflare Worker '${SCRIPT_NAME}' (${ACCOUNT_ID})...\n`);
  for (const [key, value] of Object.entries(SECRETS_TO_SET)) {
    await setSecret(key, value);
  }
  console.log(`\n🎉 All Cloudflare Worker secrets synchronized!`);
}

run().catch(console.error);
