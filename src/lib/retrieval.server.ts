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
  /** Enable Reciprocal Rank Fusion of dense vectors and sparse lexical search (defaults to true). */
  enableHybridRrf?: boolean;
};

/**
 * Syllabus-aware Query Expansion for Cambridge 9708 Economics.
 * Enriches short or ambiguous questions with core syllabus concept keywords,
 * models, diagrams, and policy mechanisms so retrieval captures both general
 * theory and specific mark-scheme guidance.
 */
export function expandEconomicQuery(query: string): string {
  const lower = query.toLowerCase();
  const additions: string[] = [];

  const TOPIC_EXPANSIONS: Array<{ triggers: RegExp; keywords: string }> = [
    {
      triggers: /\b(inflation|deflation|disinflation|price level)\b/i,
      keywords: "CPI, purchasing power, cost-push, demand-pull, money supply, Phillips curve, real wage, menu costs",
    },
    {
      triggers: /\b(monetary policy|interest rates?|central bank|money supply)\b/i,
      keywords: "interest rates, quantitative easing, commercial bank liquidity, transmission mechanism, borrowing costs, aggregate demand, exchange rate transmission",
    },
    {
      triggers: /\b(fiscal policy|budget deficit|taxation|taxes?|government spending)\b/i,
      keywords: "automatic stabilisers, discretionary fiscal policy, national debt, crowding out, marginal propensity to consume, multiplier effect",
    },
    {
      triggers: /\b(exchange rates?|depreciation|appreciation|devaluation)\b/i,
      keywords: "Marshall-Lerner condition, J-curve effect, current account balance, terms of trade, hot money flows, export competitiveness",
    },
    {
      triggers: /\b(unemployment|employment|jobs?)\b/i,
      keywords: "cyclical unemployment, structural, frictional, natural rate of unemployment, labour market flexibility, minimum wage",
    },
    {
      triggers: /\b(externalit(y|ies)|market failure|merit|demerit|public goods?)\b/i,
      keywords: "marginal social benefit, marginal social cost, deadweight loss, non-rival, non-excludable, information failure, carbon tax, tradable permits",
    },
    {
      triggers: /\b(monopol(y|ies)|oligopol(y|ies)|market structure)\b/i,
      keywords: "kinked demand curve, price discrimination, barriers to entry, abnormal profit, contestable markets, collusion, allocative and productive efficiency",
    },
    {
      triggers: /\b(elasticit(y|ies)|ped|pes|yed|xed)\b/i,
      keywords: "price elasticity of demand, price elasticity of supply, income elasticity, cross elasticity, tax incidence, total revenue test",
    },
    {
      triggers: /\b(balance of payments|current account|trade deficit)\b/i,
      keywords: "trade in goods and services, primary income, secondary income, financial account, expenditure-switching, expenditure-reducing",
    },
  ];

  for (const { triggers, keywords } of TOPIC_EXPANSIONS) {
    if (triggers.test(lower)) {
      additions.push(keywords);
    }
  }

  if (additions.length === 0) return query;
  return `${query}\n\nKey syllabus concepts: ${additions.join("; ")}`;
}

/**
 * Computes sparse lexical relevance score based on query term frequency
 * with heading and title boosts.
 */
export function computeLexicalScore(
  chunk: { content: string; heading: string | null; document_title: string },
  queryTerms: string[],
): number {
  if (queryTerms.length === 0) return 0;

  const contentLower = chunk.content.toLowerCase();
  const headingLower = (chunk.heading ?? "").toLowerCase();
  const titleLower = chunk.document_title.toLowerCase();

  let score = 0;
  for (const term of queryTerms) {
    if (term.length < 3) continue;
    // Word boundary exact matches
    const termRegex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    const contentMatches = (contentLower.match(termRegex) || []).length;
    const headingMatches = (headingLower.match(termRegex) || []).length;
    const titleMatches = (titleLower.match(termRegex) || []).length;

    score += contentMatches * 1.0;
    score += headingMatches * 2.5; // Heading boost
    score += titleMatches * 3.0; // Document title boost
  }

  return score;
}

/**
 * Reciprocal Rank Fusion (RRF) combining dense vector similarity rank
 * with sparse lexical relevance rank.
 * Formula: RRF(d) = (0.6 / (60 + rankDense)) + (0.4 / (60 + rankSparse))
 */
export function reciprocalRankFusion(
  rows: MatchRow[],
  query: string,
  targetCount: number,
): MatchRow[] {
  if (rows.length <= targetCount) return rows;

  // Extract clean query terms (length >= 3, alphanumeric)
  const queryTerms = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  // 1. Dense rank (already sorted by vector similarity descending)
  const denseRankMap = new Map<string, number>();
  rows.forEach((row, index) => {
    denseRankMap.set(row.chunk_id, index + 1);
  });

  // 2. Sparse lexical rank
  const scoredRows = rows.map((row) => ({
    row,
    lexicalScore: computeLexicalScore(row, queryTerms),
  }));

  scoredRows.sort((a, b) => b.lexicalScore - a.lexicalScore);

  const sparseRankMap = new Map<string, number>();
  const lexicalScoreMap = new Map<string, number>();
  scoredRows.forEach((item, index) => {
    sparseRankMap.set(item.row.chunk_id, index + 1);
    lexicalScoreMap.set(item.row.chunk_id, item.lexicalScore);
  });

  // 3. Compute RRF score
  // Equal reciprocal voting: RRF(d) = 1/(K + rankDense) + 1/(K + rankSparse)
  // Non-matching lexical chunks receive 0 sparse score rather than unearned rank boost
  const K = 60;
  const fused = rows.map((row) => {
    const denseRank = denseRankMap.get(row.chunk_id) ?? rows.length;
    const sparseRank = sparseRankMap.get(row.chunk_id) ?? rows.length;
    const lexicalScore = lexicalScoreMap.get(row.chunk_id) ?? 0;
    const sparseContribution = lexicalScore > 0 ? 1 / (K + sparseRank) : 0;
    const rrfScore = 1 / (K + denseRank) + sparseContribution;
    return { row, rrfScore };
  });

  fused.sort((a, b) => b.rrfScore - a.rrfScore);

  return fused.slice(0, targetCount).map((item) => item.row);
}

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

type CacheEntry = {
  sources: GroundingSource[];
  timestamp: number;
};

// In-memory cache for recent vector queries — prevents repeated embedding API
// and pgvector calls when the same topic/question is checked during an active
// writing, grading, or live-examiner session.
const RETRIEVAL_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_CACHE_ENTRIES = 250;

function getCacheKey(options: RetrieveOptions): string {
  const types = options.docTypes ? [...options.docTypes].sort().join(",") : "all";
  const topic = options.topicId ?? "none";
  const count = options.matchCount ?? 8;
  const minSim = options.minSimilarity ?? 0.25;
  const rrf = options.enableHybridRrf !== false ? "rrf" : "dense";
  return `${options.query.trim().toLowerCase()}::${types}::${topic}::${count}::${minSim}::${rrf}`;
}

export function deduplicateSources(sources: GroundingSource[]): GroundingSource[] {
  const seenPrefixes = new Set<string>();
  const result: GroundingSource[] = [];
  for (const src of sources) {
    const norm = src.snippet
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 150);
    if (seenPrefixes.has(norm)) continue;
    seenPrefixes.add(norm);
    result.push(src);
  }
  return result;
}

export async function retrieve(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  options: RetrieveOptions,
): Promise<GroundingSource[]> {
  const cacheKey = getCacheKey(options);
  const now = Date.now();
  const cached = RETRIEVAL_CACHE.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.sources;
  }

  const expandedQuery = expandEconomicQuery(options.query);
  const queryEmbedding = await embedOne(expandedQuery, MODEL_EMBEDDING);
  const matchTarget = options.matchCount ?? 8;
  // Over-fetch by 2x when hybrid RRF is enabled to allow reciprocal reranking across candidates
  const fetchCount = options.enableHybridRrf !== false ? Math.min(24, matchTarget * 2) : matchTarget;

  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: fetchCount,
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

  // Apply Reciprocal Rank Fusion (RRF) between dense and sparse ranks
  const finalRows =
    options.enableHybridRrf !== false
      ? reciprocalRankFusion(matches, options.query, matchTarget)
      : matches.slice(0, matchTarget);

  const mapped = finalRows.map((row) => ({
    documentId: row.document_id,
    documentTitle: row.document_title,
    docType: row.doc_type,
    heading: row.heading,
    snippet: row.content,
    similarity: Number(row.similarity.toFixed(4)),
  }));

  const deduped = deduplicateSources(mapped);

  if (RETRIEVAL_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = RETRIEVAL_CACHE.keys().next().value;
    if (oldestKey) RETRIEVAL_CACHE.delete(oldestKey);
  }
  RETRIEVAL_CACHE.set(cacheKey, { sources: deduped, timestamp: now });

  return deduped;
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
