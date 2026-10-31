import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const supabase = createClient(
  "https://srukuuhxloxdukonmual.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNydWt1dWh4bG94ZHVrb25tdWFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg4MjY1MCwiZXhwIjoyMTA1NDU4NjUwfQ.65A0ejLXOuqjMeMKcX30gJr0h6LmtrF2JiR0P35tu_E"
);

async function inspect() {
  const { data: papers } = await supabase.from("mcq_pdf_papers").select("id, title, level, exam_year, exam_series");
  console.log("=== MCQ PAPERS ===");
  console.log("Total:", papers?.length);
  const byLevel = papers?.reduce((acc: any, p: any) => {
    acc[p.level] = (acc[p.level] || 0) + 1;
    return acc;
  }, {});
  console.log("By level:", byLevel);

  const a2Papers = papers?.filter((p: any) => p.level === "a2");
  console.log("A2 (A Level) MCQ papers:", a2Papers?.map((p: any) => p.title));

  const { data: kDocs } = await supabase.from("knowledge_documents").select("id, title, doc_type, exam_series, status, chunk_count");
  console.log("\n=== KNOWLEDGE DOCUMENTS ===");
  console.log("Total:", kDocs?.length);
  const kByDocType = kDocs?.reduce((acc: any, d: any) => {
    acc[d.doc_type] = (acc[d.doc_type] || 0) + 1;
    return acc;
  }, {});
  console.log("By doc_type:", kByDocType);

  const a2KDocs = kDocs?.filter((d: any) => 
    d.title.toLowerCase().includes("a2") ||
    d.title.toLowerCase().includes("a level") ||
    d.title.toLowerCase().includes("paper 3") ||
    d.title.toLowerCase().includes("paper 4") ||
    (d.exam_series && d.exam_series.toLowerCase().includes("a level"))
  );
  console.log("A Level Knowledge Docs count:", a2KDocs?.length);
  console.log("A Level Knowledge Docs titles:", a2KDocs?.map((d: any) => `[${d.doc_type}] ${d.title}`));
}

inspect().catch(console.error);
