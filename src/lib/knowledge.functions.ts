import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type KnowledgeAuthContext = { supabase: SupabaseClient<Database>; userId: string; email?: string; claims?: any };

export async function assertKnowledgeStaff(context: KnowledgeAuthContext) {
  // 1. Check if user is Marginal platform administrator
  const { isMarginalAdmin } = await import("./auth-admin");
  const isMarginal = isMarginalAdmin({
    userId: context.userId,
    claims: (context as any).claims,
    email: (context as any).email || (context as any).claims?.email,
  });
  if (isMarginal) {
    return;
  }

  // 2. Check user_roles table using context.supabase first
  try {
    const { data: roles, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["teacher", "admin"]);
    if (!error && roles && roles.length > 0) {
      return;
    }
  } catch {
    // Continue checking other claims/sources
  }

  const { supabaseAdmin } = await import("@/integrations/backend/client.server");
  const db = supabaseAdmin;

  if (db && db !== (context.supabase as any)) {
    try {
      const { data: roles } = await db
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId)
        .in("role", ["teacher", "admin"]);
      if (roles && roles.length > 0) {
        return;
      }
    } catch {
      // Continue
    }
  }

  // 3. Check JWT claims metadata
  const userMetadataRole = (context as any).claims?.user_metadata?.role;
  const appMetadataRole = (context as any).claims?.app_metadata?.role;
  if (
    userMetadataRole === "teacher" ||
    appMetadataRole === "teacher" ||
    userMetadataRole === "admin" ||
    appMetadataRole === "admin"
  ) {
    return;
  }

  // 4. Check approved teacher profile
  if (db) {
    try {
      const { data: tp } = await db
        .from("teacher_profiles")
        .select("status")
        .eq("user_id", context.userId)
        .maybeSingle();
      if (tp?.status === "approved") {
        return;
      }
    } catch {
      // Continue
    }
  }

  throw new Error("Teacher or administrator access is required.");
}

const IngestInput = z.object({
  title: z.string().trim().min(1).max(200),
  docType: z.enum([
    "coursebook",
    "syllabus",
    "mark_scheme",
    "past_paper",
    "examiner_report",
    "notes",
    "other",
  ]),
  sourceName: z.string().trim().max(200).optional(),
  examSeries: z.string().trim().max(60).optional(),
  storagePath: z.string().trim().max(400).optional(),
  text: z.string().min(1).max(30_000_000),
});

/**
 * Stage a document: chunk it and store the chunks unembedded. Embedding runs
 * afterwards in small batches so a 600-page coursebook can never blow the
 * request budget, and the UI gets a real progress signal.
 */
export const ingestDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IngestInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertKnowledgeStaff(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const db = supabaseAdmin ?? context.supabase;
    const { userId } = context;

    const { chunkText, contentHash } = await import("./chunking.server");

    const chunks = chunkText(data.text);
    if (chunks.length === 0) {
      throw new Error(
        "No readable text was found in this file. If it is a scanned PDF, it needs to be OCR'd first.",
      );
    }

    const hash = await contentHash(data.text);

    // Scoped to (content_hash, doc_type): the same source file can
    // legitimately exist twice for two different purposes — e.g. a past
    // paper uploaded once as "past paper" and again as a different doc
    // type. Matching on content_hash alone would silently attach a new
    // upload to an existing document of a *different* type instead of
    // creating its own row.
    const { data: existing } = await db
      .from("knowledge_documents")
      .select("id, title")
      .eq("content_hash", hash)
      .eq("doc_type", data.docType)
      .maybeSingle();

    if (existing) {
      return {
        documentId: existing.id,
        chunkCount: 0,
        duplicateOf: existing.title,
      };
    }

    const { data: doc, error: docError } = await db
      .from("knowledge_documents")
      .insert({
        title: data.title,
        doc_type: data.docType,
        source_name: data.sourceName ?? null,
        exam_series: data.examSeries ?? null,
        storage_path: data.storagePath ?? null,
        content_hash: hash,
        char_count: data.text.length,
        chunk_count: chunks.length,
        status: "processing",
        uploaded_by: userId,
      })
      .select("id")
      .single();

    if (docError || !doc) {
      throw new Error(
        docError?.message ?? "Could not save the document into the knowledge base.",
      );
    }

    const rows = chunks.map((chunk) => ({
      document_id: doc.id,
      chunk_index: chunk.index,
      content: chunk.content,
      heading: chunk.heading,
      token_estimate: chunk.tokenEstimate,
    }));

    for (let offset = 0; offset < rows.length; offset += 200) {
      const { error } = await db
        .from("document_chunks")
        .insert(rows.slice(offset, offset + 200));
      if (error) {
        await db
          .from("knowledge_documents")
          .update({ status: "failed", error_message: error.message })
          .eq("id", doc.id);
        throw new Error(`Saving the document text failed: ${error.message}`);
      }
    }

    return { documentId: doc.id, chunkCount: chunks.length, duplicateOf: null as string | null };
  });

const EMBED_BATCH = 50;

/**
 * Safe (no api_key) list of saved embedding-purpose providers, for the
 * per-call picker on the Knowledge page — lets a teacher choose Google vs
 * OpenRouter vs whichever else is saved for a specific ingestion job instead
 * of always inheriting whatever is flagged active in Admin → Embeddings.
 * Uses supabaseAdmin because ai_provider_keys' RLS is admin-only for SELECT,
 * but any authenticated staff member ingesting knowledge needs to see the
 * (label-only) options to choose from.
 */
export const listEmbeddingProviderOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertKnowledgeStaff(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { data, error } = await supabaseAdmin
      .from("ai_provider_keys")
      .select("id, provider, label, model, is_active")
      .eq("purpose", "embedding")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id as string,
      provider: row.provider as string,
      label: row.label as string,
      model: row.model as string,
      isActive: row.is_active as boolean,
    }));
  });

/** Embed the next slice of a document's chunks. Call until `done` is true. */
export const embedNextBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ documentId: z.string().uuid(), embeddingProviderId: z.string().uuid().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertKnowledgeStaff(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const db = supabaseAdmin ?? context.supabase;
    const { embed } = await import("./ai.server");
    const { MODEL_EMBEDDING } = await import("./examiner/config");

    let overrideProvider: import("./ai/active.server").ProviderConfig | null | undefined =
      undefined;
    if (data.embeddingProviderId) {
      const { getProviderConfigById } = await import("./ai/active.server");
      overrideProvider = await getProviderConfigById(data.embeddingProviderId);
      if (!overrideProvider) {
        throw new Error("The selected embedding provider key no longer exists.");
      }
    }

    const { data: pending, error } = await db
      .from("document_chunks")
      .select("id, content")
      .eq("document_id", data.documentId)
      .is("embedding", null)
      .order("chunk_index", { ascending: true })
      .limit(EMBED_BATCH);

    if (error) throw new Error(error.message);

    if (!pending || pending.length === 0) {
      await db
        .from("knowledge_documents")
        .update({ status: "ready", error_message: null })
        .eq("id", data.documentId);
      return { done: true, embedded: 0, remaining: 0 };
    }

    try {
      const vectors = await embed(
        pending.map((chunk) => chunk.content),
        MODEL_EMBEDDING,
        overrideProvider,
      );

      // Concurrent parallel update to eliminate sequential round-trip latency (30x speedup)
      const updateTasks = pending.map((chunk, index) => {
        let vector = vectors[index];
        if (!vector || !Array.isArray(vector)) return Promise.resolve({ error: null });
        if (vector.length < 2048) {
          vector = [...vector, ...new Array(2048 - vector.length).fill(0)];
        } else if (vector.length > 2048) {
          vector = vector.slice(0, 2048);
        }
        return db
          .from("document_chunks")
          .update({ embedding: JSON.stringify(vector) })
          .eq("id", chunk.id);
      });

      const updateResults = await Promise.all(updateTasks);
      for (const res of updateResults) {
        if (res && "error" in res && res.error) {
          throw new Error(res.error.message);
        }
      }
    } catch (embedError) {
      const message = embedError instanceof Error ? embedError.message : "Embedding failed.";
      await db
        .from("knowledge_documents")
        .update({ status: "failed", error_message: message })
        .eq("id", data.documentId);
      throw new Error(message);
    }

    const { count } = await db
      .from("document_chunks")
      .select("id", { count: "exact", head: true })
      .eq("document_id", data.documentId)
      .is("embedding", null);

    const remaining = count ?? 0;
    if (remaining === 0) {
      await db
        .from("knowledge_documents")
        .update({ status: "ready", error_message: null })
        .eq("id", data.documentId);
    }

    return { done: remaining === 0, embedded: pending.length, remaining };
  });

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const db = supabaseAdmin ?? context.supabase;
    const { data, error } = await db
      .from("knowledge_documents")
      .select(
        "id, title, doc_type, source_name, exam_series, char_count, chunk_count, status, error_message, created_at",
      )
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        documentId: z.string().uuid().optional(),
      })
      .refine((d) => Boolean(d.id || d.documentId), {
        message: "Document ID is required",
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertKnowledgeStaff(context);
    const docId = data.documentId || data.id;
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const db = supabaseAdmin ?? context.supabase;
    const { error } = await db.from("knowledge_documents").delete().eq("id", docId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reembedAllDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertKnowledgeStaff(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const db = supabaseAdmin ?? context.supabase;

    const { error: chunkError } = await db
      .from("document_chunks")
      .update({ embedding: null })
      .not("embedding", "is", null);
    if (chunkError) throw new Error(`Could not clear existing embeddings: ${chunkError.message}`);

    const { data: documents, error: docError } = await db
      .from("knowledge_documents")
      .update({ status: "processing", error_message: null })
      .in("status", ["ready", "failed"])
      .select("id");
    if (docError)
      throw new Error(`Could not queue documents for re-embedding: ${docError.message}`);

    return { queued: documents?.length ?? 0 };
  });

export const searchKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().trim().min(2).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { retrieve } = await import("./retrieval.server");
    return retrieve(context.supabase, { query: data.query, matchCount: 10, enableHybridRrf: true });
  });

export const getKnowledgeStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: docs, error: docError } = await supabase
      .from("knowledge_documents")
      .select("id, title, doc_type, status, char_count, chunk_count");
    if (docError) throw new Error(docError.message);

    const { count: pendingChunks } = await supabase
      .from("document_chunks")
      .select("id", { count: "exact", head: true })
      .is("embedding", null);

    const { count: totalChunks } = await supabase
      .from("document_chunks")
      .select("id", { count: "exact", head: true });

    const total = totalChunks ?? 0;
    const pending = pendingChunks ?? 0;

    return {
      totalDocuments: docs?.length ?? 0,
      readyDocuments: docs?.filter((d) => d.status === "ready").length ?? 0,
      processingDocuments: docs?.filter((d) => d.status === "processing").length ?? 0,
      failedDocuments: docs?.filter((d) => d.status === "failed").length ?? 0,
      totalChunks: total,
      pendingChunks: pending,
      embeddedChunks: Math.max(0, total - pending),
    };
  });
