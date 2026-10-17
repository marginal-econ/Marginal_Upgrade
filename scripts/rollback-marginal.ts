const TOKEN = "cfut_CKWr1g87FEg78AriwxXeIzQgGIkunE9OMLyzdVtg04c39b0c";
const ACCOUNT_ID = "92f9a225db30843e51f045549a55017a";
const SCRIPT = "marginal";
const TARGET_VERSION = "7ba9939f-7340-4a5c-8889-811779d10cdd"; // Original Oct 9th deployment

async function rollback() {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT}/deployments?force=true`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      strategy: "percentage",
      versions: [
        {
          version_id: TARGET_VERSION,
          percentage: 100,
        },
      ],
    }),
  });
  const json = await res.json();
  console.log("Rollback result:", JSON.stringify(json, null, 2));
}

rollback().catch(console.error);
