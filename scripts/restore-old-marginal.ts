const TOKEN = "cfut_CKWr1g87FEg78AriwxXeIzQgGIkunE9OMLyzdVtg04c39b0c";
const ACCOUNT_ID = "92f9a225db30843e51f045549a55017a";
const SCRIPT_NAME = "marginal";

const OLD_SECRETS: Record<string, string> = {
  BACKEND_URL: "https://xdqafkfmxpekuticnpob.supabase.co",
  VITE_BACKEND_URL: "https://xdqafkfmxpekuticnpob.supabase.co",
  SUPABASE_URL: "https://xdqafkfmxpekuticnpob.supabase.co",
  BACKEND_PUBLISHABLE_KEY: "sb_publishable_nfisWK622Ib1rqfc0dXNbg_cNVwHzZ7",
  VITE_BACKEND_PUBLISHABLE_KEY: "sb_publishable_nfisWK622Ib1rqfc0dXNbg_cNVwHzZ7",
  BACKEND_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkcWFma2ZteHBla3V0aWNucG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzUzNTQ3NSwiZXhwIjoyMTAzMTExNDc1fQ.z0rxbvw_A0B89FZZtzZEJzHxqdYAtjV6FPLOXaOwjwg",
  SUPABASE_SECRET_KEY: "sb_secret_cDOlV3Rn3r20kEy7KaFtxA_wZBcMQkI",
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
  console.log(`[Restore Secret] ${name}:`, json.success ? "RESTORED" : json.errors);
}

async function run() {
  console.log(`Restoring old secrets on '${SCRIPT_NAME}'...`);
  for (const [key, value] of Object.entries(OLD_SECRETS)) {
    await setSecret(key, value);
  }
  console.log("Restoration complete.");
}

run().catch(console.error);
