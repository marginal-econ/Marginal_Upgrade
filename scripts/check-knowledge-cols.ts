import { createClient } from "@supabase/supabase-js";

const S1_URL = "https://xdqafkfmxpekuticnpob.supabase.co";
const S1_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkcWFma2ZteHBla3V0aWNucG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzUzNTQ3NSwiZXhwIjoyMTAzMTExNDc1fQ.z0rxbvw_A0B89FZZtzZEJzHxqdYAtjV6FPLOXaOwjwg";

const S2_URL = "https://srukuuhxloxdukonmual.supabase.co";
const S2_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNydWt1dWh4bG94ZHVrb25tdWFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg4MjY1MCwiZXhwIjoyMTA1NDU4NjUwfQ.65A0ejLXOuqjMeMKcX30gJr0h6LmtrF2JiR0P35tu_E";

const s1 = createClient(S1_URL, S1_KEY, { auth: { persistSession: false } });
const s2 = createClient(S2_URL, S2_KEY, { auth: { persistSession: false } });

async function checkCols() {
  const { data: kd1 } = await s1.from("knowledge_documents").select("*").limit(1);
  const { data: kd2 } = await s2.from("knowledge_documents").select("*").limit(1);
  console.log("S1 knowledge_docs cols:", Object.keys(kd1?.[0] || {}));
  console.log("S2 knowledge_docs cols:", Object.keys(kd2?.[0] || {}));

  const { data: dc1 } = await s1.from("document_chunks").select("*").limit(1);
  const { data: dc2 } = await s2.from("document_chunks").select("*").limit(1);
  console.log("S1 document_chunks cols:", Object.keys(dc1?.[0] || {}));
  console.log("S2 document_chunks cols:", Object.keys(dc2?.[0] || {}));

  const { data: mcq1 } = await s1.from("mcq_pdf_papers").select("*").limit(1);
  const { data: mcq2 } = await s2.from("mcq_pdf_papers").select("*").limit(1);
  console.log("S1 mcq_pdf_papers cols:", Object.keys(mcq1?.[0] || {}));
  console.log("S2 mcq_pdf_papers cols:", Object.keys(mcq2?.[0] || {}));
}

checkCols().then(() => process.exit(0)).catch(console.error);
