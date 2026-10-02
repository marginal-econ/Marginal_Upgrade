// Retrieval used to ground every AI response. Nothing calls a model without
// first pulling the relevant syllabus / mark scheme / textbook material.
import type { SupabaseClient } from "@supabase/supabase-js";

import { embedOne } from "./ai.server";
import { getActiveEmbeddingProvider } from "./ai/active.server";
import { MODEL_EMBEDDING } from "./examiner/config";
import type { GroundingSource } from "./examiner/types";

export type DocType =
  "coursebook" | "syllabus" | "mark_scheme" | "past_paper" | "examiner_report" | "notes" | "other";

type MatchRow = {
  chunk_id: string;
  document_id: string;
  document_title: string;
  doc_type: DocType;
  heading: string | null;
  content: string;
  similarity: number;
};

export type RetrieveOptions = {
  query: string;
  matchCount?: number;
  docTypes?: DocType[];
  topicId?: string | null;
  /** Chunks below this cosine similarity are dropped as irrelevant noise. */
  minSimilarity?: number;
};

/**
 * Below this raw cosine similarity, a match is not "weakly relevant" — it is
 * statistically indistinguishable from two vectors that were never in the
 * same embedding space to begin with. Real (even loosely related) content in
 * this knowledge base scores well above this. The only thing that reliably
 * flattens EVERY candidate's similarity this low, regardless of what the
 * question is, is a provider/model mismatch: the documents were embedded
 * once by one provider (e.g. Google Gemini) and the ACTIVE embedding
 * provider used for this query (Admin -> Embeddings) is a different one
 * (e.g. an OpenRouter model). Vectors from different embedding models are
 * not comparable at all, even when pgvector happily accepts them because
 * they happen to be the same dimensionality.
 */
const SPACE_MISMATCH_CEILING = 0.08;

export async function retrieve(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  options: RetrieveOptions,
): Promise<GroundingSource[]> {
  const queryEmbedding = await embedOne(options.query, MODEL_EMBEDDING);

  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: options.matchCount ?? 8,
    filter_doc_types: options.docTypes ?? null,
    filter_topic_id: options.topicId ?? null,
  });

  if (error) throw new Error(`Knowledge search failed: ${error.message}`);

  const rows = (data ?? []) as MatchRow[];
  const minSimilarity = options.minSimilarity ?? 0.25;
  const matches = rows.filter((row) => row.similarity >= minSimilarity);

  // Before accepting "nothing relevant was found" at face value, rule out
  // the far more common real cause of a zero-match result: an embedding
  // space mismatch between what's stored and what's active right now. This
  // used to be silently indistinguishable from a genuinely empty knowledge
  // base — it now fails loudly with a fix, exactly like a hard retrieval
  // error already does, instead of quietly grading ungrounded.
  if (matches.length === 0 && rows.length > 0) {
    const topSimilarity = Math.max(...rows.map((row) => row.similarity));
    if (topSimilarity < SPACE_MISMATCH_CEILING) {
      const active = await getActiveEmbeddingProvider();
      const activeLabel = active
        ? `${active.label} (${active.provider} \u00b7 ${active.model})`
        : "the built-in default embedding model";
      throw new Error(
        `Knowledge base search found candidates but every one scored far below the relevance floor ` +
          `(best match ${(topSimilarity * 100).toFixed(1)}%, vs the ${(minSimilarity * 100).toFixed(0)}% needed) ` +
          `— that flat, near-zero pattern across every candidate is the signature of an embedding-provider ` +
          `mismatch, not an empty knowledge base. Your documents were embedded with a different provider/model ` +
          `than the one currently active for embedding (${activeLabel}). Fix under Admin \u2192 Embeddings: either ` +
          `switch the active embedding provider back to whichever one originally embedded this knowledge base, ` +
          `or re-embed the knowledge base under the current provider (Admin \u2192 Knowledge). Grading is stopped ` +
          `rather than silently proceeding without real grounding.`,
      );
    }
  }

  return matches.map((row) => ({
    documentId: row.document_id,
    documentTitle: row.document_title,
    docType: row.doc_type,
    heading: row.heading,
    snippet: row.content,
    similarity: Number(row.similarity.toFixed(4)),
  }));
}

/**
 * Render retrieved chunks as a numbered, citable context block. The [S1]-style
 * markers let the model cite instead of inventing.
 */
export function renderContext(sources: GroundingSource[]): string {
  if (sources.length === 0) return "";

  const blocks = sources.map((source, index) => {
    const label = source.heading
      ? `${source.documentTitle} — ${source.heading}`
      : source.documentTitle;
    return `[S${index + 1}] (${source.docType.replace("_", " ")}) ${label}\n${source.snippet}`;
  });

  return [
    "RETRIEVED CAMBRIDGE SOURCE MATERIAL — this is the only material you may treat as authoritative.",
    "Cite the sources you use with their [S#] markers. If the material below does not cover something,",
    "say so plainly rather than inventing syllabus content, mark scheme wording, or examiner report claims.",
    "",
    blocks.join("\n\n"),
  ].join("\n");
}
