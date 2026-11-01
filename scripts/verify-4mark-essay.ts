import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { setRuntimeEnv } from "../src/server/env";
import { gradeEssay } from "../src/lib/examiner/grade.server";

function loadEnvFallback() {
  const envPath = path.resolve(process.cwd(), ".env");
  const envObj: Record<string, string> = {};
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
        process.env[key] = val;
        envObj[key] = val;
      }
    }
  }
  setRuntimeEnv(envObj);
}
loadEnvFallback();

const SUPABASE_URL = process.env.BACKEND_URL || process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.BACKEND_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const question = "Assess whether supply-side policy is the best method to reduce the rate of inflation.";
const essayText = `Supply-side policies are policies aimed at increasing the aggregate supply of the economy. This involves retraining workers to increase their skills and qualifications to increase their employability, thus increasing their standard of living, causing economic growth. Inflation is essentially the rise in price level of an economy over a period of time.

Inflation rate is the percentage by which the inflation changes and can be classified into two types, there is creeping inflation and accelerating inflation. Creeping inflation is a very low rate of inflation and accelerating inflation is an extremely high growth rate of inflation. It is characterised by over a 50% increase in price level a month.

One type of supply-side policy is reformation of trade unions. This involves reducing the negotiating power trade unions have in bargaining for high wages, so that firms can instead employ a larger number of workers at a lower wage level. This helps prevent the wage-inflation spiral that occurs after workers press for higher wages leading to higher costs of production for the firm thus higher prices. So due to higher prices workers again press for higher wages which results in a spiral that leads to inflation. Thus prevents the rate of inflation from increasing to a certain extent.

Another supply-side policy is provision of education and training. This increases the skills thus productivity of each worker thus increasing the productive capacity of a firm leading to economic growth. This can lead to low export prices as increased productivity and efficiency lead to more competitive goods. This leads to lower import prices for trading countries, caps their cost-push inflation leading to low rate of inflation for them. This may lead to a more favourable trading agreement for the exporting country, so cost-push inflation of exporting country also decreases. Reducing the rate of inflation. Furthermore this increase in aggregate supply means that demand-pull inflation will decrease as slowly equals AD.

Provision of increased health care will also lead to better living standard of consumers which will increase their productivity thus increasing aggregate supply, thereby controlling demand-pull inflation leading to low rate of inflation.

Overtime as skills and productivity of workers rise both AD and AS are more likely to stay in equilibrium which leads to a good rate of inflation aka ‘creeping inflation’. This low level of inflation is positive since it promises a good economic future.

However increased skills and qualification of workers may make them move out of the country in search of better employment opportunities or better living standards. This is called ‘brain drain’. This means those who are less skilled and qualified are left behind, meaning the home country’s workers still present in the country have low skill so low productive potential of firm. There will be a rise in cost of production due to mismatch between productivity and wage rate of workers leading to cost-push inflation which increases the rate of inflation.

Investing in technology and research and development as a form of supply side policy may exacerbate the rate of inflation in the short-run due to increased investment leading to rise in money supply without increasing aggregate supply to combat increase in aggregate demand. However in the long-run it will lead to development of better methods of production leading to increased quantity and quality of domestically produced goods. This increase in aggregate supply helps lower rate of inflation by lowering cost-push inflation.

In conclusion a mix of all the supply-side policies along with the implementation of contractionary demand side policies will help reduce the rate of inflation in both the short-run and the long-run. The government should analyse the situation of the economy and accordingly decide the magnitude of implementation of the supply-side and demand-side policies to ensure a low and stable rate of inflation. As a high rate of inflation causes uncertainty and instability in an economy which leads to low economic growth. However if only one supply-side policy had to be chosen it would be to improve the education and training of workers as it would help increase aggregate supply sustainably according to aggregate demand.`;

async function main() {
  console.log("=== RUNNING LIVE GRADING ON CAMBRIDGE 4/12 SCRIPT ===");
  console.log("Question:", question);
  console.log("Tariff: 12 marks (AO1: 2, AO2: 6, AO3: 4)");

  const outcome = await gradeEssay(supabase, {
    question,
    essayText,
    maxMark: 12,
    split: { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 },
  });

  console.log("\n--- RESULT ---");
  console.log("Total Mark:", outcome.grading.total_mark, "/ 12");
  console.log("Band:", outcome.grading.band);
  console.log("AO1 (Knowledge):", outcome.grading.ao_breakdown.knowledge.awarded, "/", outcome.grading.ao_breakdown.knowledge.out_of);
  console.log("AO2 (Analysis):", outcome.grading.ao_breakdown.analysis.awarded, "/", outcome.grading.ao_breakdown.analysis.out_of);
  console.log("AO3 (Evaluation):", outcome.grading.ao_breakdown.evaluation.awarded, "/", outcome.grading.ao_breakdown.evaluation.out_of);
  console.log("Anchors used:", outcome.grading.anchorsUsed);
  console.log("Grounding status:", outcome.grading.grounding_status);
  console.log("\nExaminer Summary:\n", outcome.grading.examiner_summary);
  console.log("\nWeaknesses:\n", outcome.grading.weaknesses);

  if (outcome.grading.total_mark === 4) {
    console.log("\nSUCCESS! PERFECT MATCH WITH CAMBRIDGE 4/12 BENCHMARK!");
  } else {
    console.error("\nFAIL: Expected 4/12, got", outcome.grading.total_mark);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error during grading test:", err);
  process.exit(1);
});
