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

async function main() {
  console.log("Triggering sendPasswordResetEmail for saikrish.econ@gmail.com...");
  const { sendPasswordResetEmail } = await import("../src/server/password-reset");
  await sendPasswordResetEmail("saikrish.econ@gmail.com");
  console.log("✅ sendPasswordResetEmail completed successfully!");
}

main().catch(console.error);
