import { createClient } from "@supabase/supabase-js";

const apply = process.argv.includes("--apply");
const oldUrl = process.env.OLD_SUPABASE_URL;
const oldKey = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY;
const newUrl = process.env.BACKEND_URL || process.env.SUPABASE_URL;
const newKey = process.env.BACKEND_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!oldUrl || !oldKey || !newUrl || !newKey)
  throw new Error("Old or new Supabase credentials are missing.");
if (oldUrl === newUrl) throw new Error("Source and destination projects must be different.");

const oldDb = createClient(oldUrl, oldKey, { auth: { persistSession: false } });
const newDb = createClient(newUrl, newKey, { auth: { persistSession: false } });
const tables = [
  "knowledge_documents",
  "document_chunks",
  "calibration_anchors",
  "bank_mcq_questions",
  "bank_essay_questions",
  "mcq_pdf_papers",
];

async function all(client, table, columns = "*") {
  const rows = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .range(from, from + 499);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}

async function insertBatches(table, rows, size = 100) {
  for (let offset = 0; offset < rows.length; offset += size) {
    const { error } = await newDb.from(table).insert(rows.slice(offset, offset + size));
    if (error) throw new Error(`${table} insert: ${error.message}`);
  }
}

async function storageFiles(client, bucket, path = "") {
  const files = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await client.storage.from(bucket).list(path, { limit: 100, offset });
    if (error) throw new Error(`${bucket}/${path}: ${error.message}`);
    for (const item of data ?? []) {
      const itemPath = path ? `${path}/${item.name}` : item.name;
      if (item.id) files.push(itemPath);
      else files.push(...(await storageFiles(client, bucket, itemPath)));
    }
    if (!data || data.length < 100) return files;
  }
}

async function copyBucket(bucket, files) {
  for (const path of files) {
    const { data, error } = await oldDb.storage.from(bucket).download(path);
    if (error || !data)
      throw new Error(`Download ${bucket}/${path}: ${error?.message ?? "empty file"}`);
    const { error: uploadError } = await newDb.storage.from(bucket).upload(path, data, {
      upsert: false,
      contentType: data.type || undefined,
    });
    if (uploadError) throw new Error(`Upload ${bucket}/${path}: ${uploadError.message}`);
  }
  return files;
}

const [oldSubjects, oldUnits, oldTopics, newSubjects, newUnits, newTopics] = await Promise.all([
  all(oldDb, "subjects"),
  all(oldDb, "units"),
  all(oldDb, "topics"),
  all(newDb, "subjects"),
  all(newDb, "units"),
  all(newDb, "topics"),
]);

const subjectMap = new Map();
for (const source of oldSubjects) {
  const target = newSubjects.find((row) => row.code === source.code);
  if (!target) throw new Error(`Destination subject is missing: ${source.code}`);
  subjectMap.set(source.id, target.id);
}
const unitMap = new Map();
for (const source of oldUnits) {
  const target = newUnits.find(
    (row) => row.code === source.code && row.subject_id === subjectMap.get(source.subject_id),
  );
  if (!target) throw new Error(`Destination unit is missing: ${source.code}`);
  unitMap.set(source.id, target.id);
}
const topicMap = new Map();
for (const source of oldTopics) {
  const target = newTopics.find(
    (row) =>
      row.unit_id === unitMap.get(source.unit_id) &&
      row.code === source.code &&
      row.name === source.name,
  );
  if (!target) throw new Error(`Destination topic is missing: ${source.code ?? source.name}`);
  topicMap.set(source.id, target.id);
}

const [documents, chunks, anchors, mcqs, essays, papers] = await Promise.all([
  all(oldDb, "knowledge_documents"),
  all(oldDb, "document_chunks"),
  all(oldDb, "calibration_anchors"),
  all(oldDb, "bank_mcq_questions"),
  all(oldDb, "bank_essay_questions"),
  all(oldDb, "mcq_pdf_papers"),
]);
const diagramPath = (url) => {
  if (!url) return null;
  const marker = "/storage/v1/object/public/bank-diagrams/";
  return url.includes(marker) ? decodeURIComponent(url.split(marker)[1]) : null;
};
const bucketFiles = {
  "mcq-papers": [
    ...new Set(papers.flatMap((paper) => [paper.qp_path, paper.ms_path]).filter(Boolean)),
  ],
  "bank-diagrams": [
    ...new Set(mcqs.map((question) => diagramPath(question.diagram_image_url)).filter(Boolean)),
  ],
};

console.log(
  JSON.stringify(
    {
      documents: documents.length,
      chunks: chunks.length,
      calibrationAnchors: anchors.length,
      mcqs: mcqs.length,
      essayQuestions: essays.length,
      papers: papers.length,
      storage: bucketFiles,
    },
    null,
    2,
  ),
);
if (!apply) {
  console.log("Dry run only. Re-run with --apply to copy this content.");
  process.exit(0);
}

for (const table of tables) {
  const { count, error } = await newDb.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  if (count)
    throw new Error(
      `Destination ${table} is not empty (${count} rows); stopping to prevent duplicates.`,
    );
}

await copyBucket("mcq-papers", bucketFiles["mcq-papers"]);
await copyBucket("bank-diagrams", bucketFiles["bank-diagrams"]);

const mappedDocuments = documents.map(({ uploaded_by: _uploadedBy, ...row }) => ({
  ...row,
  subject_id: row.subject_id ? (subjectMap.get(row.subject_id) ?? null) : null,
  unit_id: row.unit_id ? (unitMap.get(row.unit_id) ?? null) : null,
  topic_id: row.topic_id ? (topicMap.get(row.topic_id) ?? null) : null,
  uploaded_by: null,
  status: "processing",
  error_message: null,
}));
const mappedChunks = chunks.map(({ embedding: _embedding, ...row }) => ({
  ...row,
  topic_id: row.topic_id ? (topicMap.get(row.topic_id) ?? null) : null,
  embedding: null,
  model_version: "google/gemini-embedding-2",
}));
const publicUrl = (bucket, path) => newDb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
await insertBatches("knowledge_documents", mappedDocuments, 100);
await insertBatches("document_chunks", mappedChunks, 100);
await insertBatches(
  "calibration_anchors",
  anchors.map(({ created_by: _createdBy, ...row }) => ({ ...row, created_by: null })),
);
await insertBatches(
  "bank_mcq_questions",
  mcqs.map(({ created_by: _createdBy, ...row }) => {
    const path = diagramPath(row.diagram_image_url);
    return {
      ...row,
      created_by: null,
      diagram_image_url: path ? publicUrl("bank-diagrams", path) : null,
    };
  }),
);
await insertBatches(
  "bank_essay_questions",
  essays.map(({ created_by: _createdBy, ...row }) => ({ ...row, created_by: null })),
);
await insertBatches(
  "mcq_pdf_papers",
  papers.map(({ uploaded_by: _uploadedBy, ...row }) => ({
    ...row,
    uploaded_by: null,
    qp_url: publicUrl("mcq-papers", row.qp_path),
    ms_url: row.ms_path ? publicUrl("mcq-papers", row.ms_path) : null,
  })),
);

console.log(
  "Content migration completed. Knowledge chunks are intentionally queued for re-embedding.",
);
