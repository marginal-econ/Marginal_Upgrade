import * as fs from "fs";
import { setRuntimeEnv } from "../src/server/env";

const envText = fs.readFileSync(".env", "utf8");
const envObj: Record<string, string> = {};
envText.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const idx = trimmed.indexOf("=");
  if (idx > 0) {
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    process.env[k] = v;
    envObj[k] = v;
  }
});
setRuntimeEnv(envObj);

import { getActiveVisionProvider, getActiveProvider } from "../src/lib/ai/active.server";

async function test() {
  const vp = await getActiveVisionProvider();
  console.log("Vision provider:", vp);
  const cp = await getActiveProvider();
  console.log("Chat provider:", cp ? { ...cp, apiKey: cp.apiKey.slice(0, 10) + "..." } : null);
}

test();
