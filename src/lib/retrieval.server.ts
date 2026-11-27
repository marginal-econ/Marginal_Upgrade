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

/**
 * Chunks below this cosine similarity are dropped as irrelevant noise.
 * In dense 2048-dim vector embeddings, random English texts share a baseline similarity of ~0.35-0.45.
 * Genuine Cambridge 9708 Economics syllabus matches score 0.55-0.85.
 * Setting the default floor to 0.50 guarantees that random noise is never treated as a source.
 */
export const DEFAULT_GROUNDING_SIMILARITY_FLOOR = 0.5;

export type RetrieveOptions = {
  query: string;
  matchCount?: number;
  docTypes?: DocType[];
  topicId?: string | null;
  /** Chunks below this cosine similarity are dropped as irrelevant noise. Default calibrated to 0.50. */
  minSimilarity?: number;
  /** Enable Reciprocal Rank Fusion of dense vectors and sparse lexical search (defaults to true). */
  enableHybridRrf?: boolean;
};

// Generic 2-letter stop words to ignore in sparse lexical queries
const GENERIC_STOP_WORDS_2 = new Set([
  "to",
  "in",
  "on",
  "at",
  "of",
  "is",
  "it",
  "an",
  "by",
  "if",
  "or",
  "so",
  "my",
  "we",
  "he",
  "do",
  "no",
  "up",
]);

/**
 * Syllabus-aware Query Expansion for Cambridge 9708 Economics (AS & A Level).
 * Enriches short or ambiguous questions with core syllabus concept keywords,
 * models, diagrams, and policy mechanisms across all micro and macro units so
 * retrieval captures both general theory and specific mark-scheme guidance.
 */
export function expandEconomicQuery(query: string): string {
  const lower = query.toLowerCase();
  const additions: string[] = [];

  const TOPIC_EXPANSIONS: Array<{ triggers: RegExp; keywords: string }> = [
    {
      triggers:
        /\b(scarcit(y|ies)|opportunity cost|ppc|ppf|production possibilit(y|ies)|basic economic (problem|idea))\b/i,
      keywords:
        "scarcity, opportunity cost, production possibility curve, allocative efficiency, productive efficiency, normative and positive statements, capital goods, consumer goods, shift vs movement on PPC",
    },
    {
      triggers:
        /\b(demand|supply|equilibrium|consumer surplus|producer surplus|price mechanism)\b/i,
      keywords:
        "law of demand, determinants of supply, equilibrium price, excess demand, excess supply, consumer surplus, producer surplus, rationing function, signalling function, incentive function",
    },
    {
      triggers: /\b(elasticit(y|ies)|ped|pes|yed|xed)\b/i,
      keywords:
        "price elasticity of demand, price elasticity of supply, income elasticity, cross elasticity, tax incidence, total revenue test, normal and inferior goods",
    },
    {
      triggers:
        /\b(tax(es|ation)?|subsid(y|ies)|price ceiling|price floor|maximum price|minimum price|indirect tax)\b/i,
      keywords:
        "specific tax, ad valorem tax, tax incidence, producer burden, consumer burden, subsidy pass-through, deadweight loss, shortage, surplus, black markets, minimum wage",
    },
    {
      triggers: /\b(externalit(y|ies)|market failure|merit|demerit|public goods?)\b/i,
      keywords:
        "marginal social benefit, marginal social cost, deadweight loss, non-rival, non-excludable, information failure, carbon tax, tradable permits, free-rider problem",
    },
    {
      triggers: /\b(inflation|deflation|disinflation|price level)\b/i,
      keywords:
        "CPI, purchasing power, cost-push, demand-pull, money supply, Phillips curve, real wage, menu costs",
    },
    {
      triggers:
        /\b(monetary policy|interest rates?|central bank|money supply|quantitative easing)\b/i,
      keywords:
        "interest rates, quantitative easing, commercial bank liquidity, transmission mechanism, borrowing costs, aggregate demand, exchange rate transmission",
    },
    {
      triggers:
        /\b(fiscal policy|budget deficit|taxation|taxes?|government spending|national debt)\b/i,
      keywords:
        "automatic stabilisers, discretionary fiscal policy, national debt, crowding out, marginal propensity to consume, multiplier effect",
    },
    {
      triggers:
        /\b(circular flow|leakages?|injections?|macroeconomic objectives)\b/i,
      keywords:
        "circular flow of income, injections, leakages, savings, taxation, imports, investment, government spending, exports, multiplier effect, macroeconomic equilibrium, national income determination",
    },
    {
      triggers:
        /\b(aggregate demand|aggregate supply|ad[- ]as|macroeconomic equilibrium|sras|lras)\b/i,
      keywords:
        "consumption, investment, government expenditure, net exports, SRAS supply shocks, Keynesian AS, classical LRAS, inflationary gap, deflationary gap",
    },
    {
      triggers: /\b(economic growth|gdp|recession|standard of living|national income)\b/i,
      keywords:
        "real GDP vs nominal GDP, potential output vs actual output, negative output gap, positive output gap, GNI, HDI, sustainability, circular flow of income",
    },
    {
      triggers: /\b(supply[- ]side policy|deregulation|privatisation|labour market flexibility)\b/i,
      keywords:
        "interventionist supply-side, market-oriented supply-side, human capital, infrastructure investment, trade union power reduction, productive capacity, shifting LRAS",
    },
    {
      triggers: /\b(unemployment|employment|jobs?)\b/i,
      keywords:
        "cyclical unemployment, structural, frictional, natural rate of unemployment, labour market flexibility, minimum wage",
    },
    {
      triggers: /\b(balance of payments|current account|trade deficit|trade surplus)\b/i,
      keywords:
        "trade in goods and services, primary income, secondary income, financial account, expenditure-switching, expenditure-reducing",
    },
    {
      triggers: /\b(exchange rates?|depreciation|appreciation|devaluation)\b/i,
      keywords:
        "Marshall-Lerner condition, J-curve effect, current account balance, terms of trade, hot money flows, export competitiveness",
    },
    {
      triggers:
        /\b(comparative advantage|absolute advantage|terms of trade|free trade|protectionism|tariff|quota)\b/i,
      keywords:
        "opportunity cost ratio, law of comparative advantage, terms of trade index, trade creation, trade diversion, tariff welfare loss, domestic producer surplus, quota rent, infant industry argument",
    },
    {
      triggers:
        /\b(monopol(y|ies)|oligopol(y|ies)|market structure|perfect competition|monopolistic competition)\b/i,
      keywords:
        "kinked demand curve, price discrimination, barriers to entry, abnormal profit, contestable markets, collusion, allocative and productive efficiency, game theory",
    },
    {
      triggers:
        /\b(cost|revenue|economies of scale|diminishing returns|marginal cost|average cost)\b/i,
      keywords:
        "law of diminishing marginal returns, marginal revenue, average revenue, internal economies of scale, external economies of scale, minimum efficient scale, diseconomies of scale",
    },
    {
      triggers:
        /\b(labour market|wage determination|trade union|economic rent|transfer earnings)\b/i,
      keywords:
        "marginal revenue product of labour (MRPL), marginal productivity theory, elasticity of demand for labour, backward bending labour supply curve, transfer earnings, economic rent",
    },
    {
      triggers:
        /\b(utility|indifference curve|budget line|consumer equilibrium|marginal utility)\b/i,
      keywords:
        "law of diminishing marginal utility, equi-marginal principle, marginal rate of substitution, income effect, substitution effect, normal goods, inferior goods",
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
 * with calibrated heading and title boosts.
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
    if (term.length < 2) continue;
    if (term.length === 2 && GENERIC_STOP_WORDS_2.has(term)) continue;

    // Word boundary exact matches
    const termRegex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    const contentMatches = (contentLower.match(termRegex) || []).length;
    const headingMatches = (headingLower.match(termRegex) || []).length;
    const titleMatches = (titleLower.match(termRegex) || []).length;

    score += contentMatches * 1.0;
    score += headingMatches * 3.0; // Calibrated heading boost
    score += titleMatches * 4.0; // Calibrated document title boost
  }

  return score;
}

/**
 * Reciprocal Rank Fusion (RRF) combining dense vector similarity rank
 * with sparse lexical relevance rank.
 * Formula: RRF(d) = 1 / (60 + rankDense) + (lexicalBoost / (60 + rankSparse))
 */
export function reciprocalRankFusion(
  rows: MatchRow[],
  query: string,
  targetCount: number,
): MatchRow[] {
  if (rows.length <= targetCount) return rows;

  // Extract clean query terms (length >= 2, excluding 2-letter generic stop words)
  const queryTerms = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !(w.length === 2 && GENERIC_STOP_WORDS_2.has(w)));

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
  // Equal reciprocal voting: RRF(d) = 1/(K + rankDense) + sparseContribution
  const K = 60;
  const fused = rows.map((row) => {
    const denseRank = denseRankMap.get(row.chunk_id) ?? rows.length;
    const sparseRank = sparseRankMap.get(row.chunk_id) ?? rows.length;
    const lexicalScore = lexicalScoreMap.get(row.chunk_id) ?? 0;
    // Calibrated lexical weight scales up when chunks directly answer query terms
    const sparseContribution =
      lexicalScore > 0 ? (1 / (K + sparseRank)) * (1 + Math.min(2, lexicalScore / 8)) : 0;
    const rrfScore = 1 / (K + denseRank) + sparseContribution;
    return { row, rrfScore };
  });

  fused.sort((a, b) => b.rrfScore - a.rrfScore);

  return fused.slice(0, targetCount).map((item) => item.row);
}

/**
 * Below this raw cosine similarity, a match is not "weakly relevant" — it is
 * statistically indistinguishable from two vectors that were never in the
 * same embedding space to begin with.
 */
const SPACE_MISMATCH_CEILING = 0.08;

type CacheEntry = {
  sources: GroundingSource[];
  timestamp: number;
};

// In-memory cache for recent vector queries
const RETRIEVAL_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_CACHE_ENTRIES = 250;

function getCacheKey(options: RetrieveOptions): string {
  const types = options.docTypes ? [...options.docTypes].sort().join(",") : "all";
  const topic = options.topicId ?? "none";
  const count = options.matchCount ?? 8;
  const minSim = options.minSimilarity ?? DEFAULT_GROUNDING_SIMILARITY_FLOOR;
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
  let queryEmbedding = await embedOne(expandedQuery, MODEL_EMBEDDING);
  if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 2048) {
    const rawLen = Array.isArray(queryEmbedding) ? queryEmbedding.length : 0;
    queryEmbedding = Array.isArray(queryEmbedding)
      ? rawLen < 2048
        ? [...queryEmbedding, ...new Array(2048 - rawLen).fill(0)]
        : queryEmbedding.slice(0, 2048)
      : new Array(2048).fill(0);
  }
  const matchTarget = options.matchCount ?? 8;
  // Over-fetch by 2x when hybrid RRF is enabled to allow reciprocal reranking across candidates
  const fetchCount =
    options.enableHybridRrf !== false ? Math.min(24, Math.max(matchTarget * 2, 16)) : matchTarget;

  let client = supabase;
  let adminClient: any = null;
  try {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    if (supabaseAdmin) adminClient = supabaseAdmin;
  } catch {}

  const primaryClient = adminClient || client;
  const secondaryClient = primaryClient === adminClient ? client : adminClient;

  let { data, error } = await primaryClient.rpc("match_document_chunks", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: fetchCount,
    filter_doc_types: options.docTypes ?? null,
    filter_topic_id: options.topicId ?? null,
  });

  if (error && secondaryClient) {
    try {
      const retry = await secondaryClient.rpc("match_document_chunks", {
        query_embedding: JSON.stringify(queryEmbedding),
        match_count: fetchCount,
        filter_doc_types: options.docTypes ?? null,
        filter_topic_id: options.topicId ?? null,
      });
      if (!retry.error) {
        data = retry.data;
        error = null;
      }
    } catch {}
  }

  if (error) throw new Error(`Knowledge search failed: ${error.message}`);

  const rows = (data ?? []) as MatchRow[];
  const minSimilarity = options.minSimilarity ?? DEFAULT_GROUNDING_SIMILARITY_FLOOR; // Calibrated floor (>=0.50)
  const matches = rows.filter((row) => row.similarity >= minSimilarity);

  // Before accepting "nothing relevant was found" at face value, rule out
  // embedding space mismatches
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

  // Exact official mark-scheme phrase lookup: guarantees past-paper mark schemes stored in
  // document_chunks (e.g. "monopolistically competitive firms will always charge") are always
  // injected first as [S1] even when dense vector search ranks a textbook chapter higher.
  const exactMsHits: GroundingSource[] = [];
  if (!options.docTypes || options.docTypes.includes("mark_scheme")) {
    try {
      const cleanedQ = options.query
        .replace(/\[\s*\d+\s*(?:marks?)?\s*\]/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      const words = cleanedQ.split(" ").filter((w) => w.length >= 2);
      const startIdx = Math.min(Math.max(0, words.length > 7 ? 2 : 0), Math.max(0, words.length - 5));
      const phrase = words.slice(startIdx, startIdx + 5).join(" ");
      if (phrase.length >= 18) {
        const { data: msRows } = await primaryClient
          .from("document_chunks")
          .select("document_id, heading, content, knowledge_documents!inner(title, doc_type)")
          .eq("knowledge_documents.doc_type", "mark_scheme")
          .ilike("content", `%${phrase}%`)
          .limit(2);
        for (const r of (msRows ?? []) as any[]) {
          if (r?.content && r?.knowledge_documents?.title) {
            exactMsHits.push({
              documentId: r.document_id,
              documentTitle: r.knowledge_documents.title,
              docType: "mark_scheme",
              heading: r.heading ?? null,
              snippet: r.content,
              similarity: 0.99,
            });
          }
        }
      }
    } catch {
      // Non-fatal: proceed with standard hybrid vector/lexical matches
    }
  }

  const deduped = deduplicateSources([...exactMsHits, ...mapped]);

  if (RETRIEVAL_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = RETRIEVAL_CACHE.keys().next().value;
    if (oldestKey) RETRIEVAL_CACHE.delete(oldestKey);
  }
  RETRIEVAL_CACHE.set(cacheKey, { sources: deduped, timestamp: now });

  return deduped;
}

const WINDOW_STOP_WORDS = new Set([
  "the", "and", "that", "this", "with", "from", "for", "are", "was", "were",
  "have", "has", "had", "does", "did", "would", "should", "could", "their",
  "they", "them", "which", "what", "when", "where", "also", "into", "onto",
  "then", "than", "more", "most", "some", "such", "only", "even", "will",
  "discuss", "assess", "evaluate", "consider", "explain", "extent", "whether",
  "statement", "always", "help", "diagram", "likely", "economy", "country",
  "government", "economic", "market", "goods", "services", "between",
]);

/**
 * Extracts the most relevant window from a large retrieved document chunk (such as
 * 25,000-char Cambridge Paper 4 Mark Schemes where Page 1-6 are generic boilerplate
 * and the actual question's Indicative Content sits on Pages 10-17).
 */
export function extractRelevantSnippetWindow(
  snippet: string,
  maxChars = 1350,
  query?: string,
): string {
  const cleaned = snippet
    .replace(/PapaCambridge\s*·\s*papacambridge\.com[^\n]*/gi, "")
    .replace(/Downloaded from PapaCambridge[^\n]*/gi, "")
    .replace(/Licensed for hosting on papacambridge\.com only\.?/gi, "")
    .replace(/Re-uploading, mirroring or re-hosting this file[^\n]*/gi, "")
    .replace(/Trace ID:\s*PC-[A-Z0-9]+/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (cleaned.length <= maxChars) return cleaned;
  if (!query || !query.trim()) return `${cleaned.slice(0, maxChars)}...`;

  const queryTerms = Array.from(
    new Set(
      query
        .toLowerCase()
        .replace(/[^\w\s-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !WINDOW_STOP_WORDS.has(w)),
    ),
  );

  if (queryTerms.length === 0) return `${cleaned.slice(0, maxChars)}...`;

  // Slide a window of size `maxChars` in 350-char steps across the document
  const step = 350;
  let bestStart = 0;
  let bestScore = -Infinity;

  for (let start = 0; start < cleaned.length; start += step) {
    const end = Math.min(cleaned.length, start + maxChars);
    const sliceLower = cleaned.slice(start, end).toLowerCase();

    let score = 0;
    let uniqueTermsHit = 0;
    for (const term of queryTerms) {
      if (sliceLower.includes(term)) {
        uniqueTermsHit++;
        score += 4;
      }
    }
    // Bonus for hitting multiple distinct question terms together (exact question match!)
    score += uniqueTermsHit * uniqueTermsHit * 0.8;

    // Bonus for actual Cambridge mark scheme content sections
    if (/indicative\s+content/i.test(sliceLower)) score += 6;
    if (/ao3\s+evaluation/i.test(sliceLower)) score += 4;
    if (/l2\s+maximum|level\s+2\s+maximum|no\s+accurate\s+diagram/i.test(sliceLower)) score += 5;

    // Heavy penalty for Page 1-6 generic mark scheme cover/preamble boilerplate
    if (/generic\s+marking\s+principle|this\s+document\s+consists\s+of\s+\d+\s+printed\s+pages|mark\s+schemes\s+should\s+be\s+read\s+in\s+conjunction/i.test(sliceLower)) {
      score -= 15;
    }

    if (score > bestScore) {
      bestScore = score;
      bestStart = start;
    }
    if (end >= cleaned.length) break;
  }

  // If no meaningful match found anywhere, fall back to start
  if (bestScore <= 0) return `${cleaned.slice(0, maxChars)}...`;

  // Snap start backward slightly to a clean boundary if possible
  let snappedStart = bestStart;
  if (snappedStart > 0) {
    const prevBreak = cleaned.lastIndexOf("\n", snappedStart);
    if (prevBreak !== -1 && snappedStart - prevBreak <= 120) {
      snappedStart = prevBreak + 1;
    }
  }
  const end = Math.min(cleaned.length, snappedStart + maxChars);
  const prefix = snappedStart > 0 ? "..." : "";
  const suffix = end < cleaned.length ? "..." : "";
  return `${prefix}${cleaned.slice(snappedStart, end).trim()}${suffix}`;
}

/**
 * Render retrieved chunks as a numbered, citable context block. The [S1]-style
 * markers let the model cite instead of inventing.
 */
export function renderContext(
  sources: GroundingSource[],
  maxCharsPerSnippet = 1350,
  query?: string,
): string {
  if (sources.length === 0) return "";

  const blocks = sources.map((source, index) => {
    const label = source.heading
      ? `${source.documentTitle} — ${source.heading}`
      : source.documentTitle;
    return `[S${index + 1}] (${source.docType.replace("_", " ")}) ${label}\n${extractRelevantSnippetWindow(source.snippet, maxCharsPerSnippet, query)}`;
  });

  return [
    "RETRIEVED CAMBRIDGE 9708 SYLLABUS & MARK SCHEME GROUNDING MATERIAL:",
    "Use this authoritative material as guidance for syllabus terminology, indicative content, and level standards. Do NOT output [S1]/[S2] tags in student-facing prose, and do NOT penalise valid Cambridge 9708 economic points merely because they are not verbatim in these excerpts.",
    "",
    blocks.join("\n\n"),
  ].join("\n");
}
