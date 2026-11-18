export type AoKey = "knowledge" | "analysis" | "evaluation";

export type AoScore = {
  awarded: number;
  out_of: number;
  comment: string;
};

export type MissingElements = {
  definitions: string[];
  analysis: string[];
  evaluation: string[];
  examples: string[];
  diagrams: string[];
};

export type GroundingSource = {
  documentId: string;
  documentTitle: string;
  docType: string;
  heading: string | null;
  snippet: string;
  similarity: number;
};

export type Grading = {
  total_mark: number;
  max_mark: number;
  band: string;
  ao_breakdown: Record<AoKey, AoScore>;
  examiner_summary: string;
  strengths: string[];
  weaknesses: string[];
  missing_elements: MissingElements;
  actionable_feedback: string[];
  suggested_resources: string[];
  suggested_practice: string[];
  confidence: number;
  audited: boolean;
  arbitrated?: boolean;
  arbitrationNotes?: string;
  sources: GroundingSource[];
  /** How many active calibration anchors were injected for this grade —
   *  0 means genuinely "none set up yet", not "skipped". */
  anchorsUsed: number;
  off_syllabus?: boolean;
  detected_subject?: string;
  grounding_status?: "grounded" | "mark_scheme_image" | "unanchored";
  model?: string;
  keyRotated?: boolean;
  modelSwapped?: boolean;
  activeKeyType?: "primary" | "backup_pool" | "vip_fallback";
  latencyMs?: number;
};

const EMPTY_MISSING: MissingElements = {
  definitions: [],
  analysis: [],
  evaluation: [],
  examples: [],
  diagrams: [],
};

import { cleanStars, stripStars } from "@/lib/utils";

/**
 * Strips conflicting numeric mark fractions (e.g. "(3/4)", "1/4", "Level 2 (3/4)")
 * from prose explanations so that comments focus purely on qualitative feedback
 * without stating conflicting or confusing numbers.
 */
export function stripScoreFractionsFromText(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  let s = value;

  // Level X (Y/Z) or Level X (Y of Z) or Level X (anything with marks/numbers) -> Level X
  s = s.replace(/\bLevel\s*(\d+)\s*\([^)]*\)/gi, "Level $1");

  // Parenthesized score fractions like (3/4), (1/4), (0/2), (2/2), (4/4), (7/8), (8/8), (1 of 2), (3 of 4)
  s = s.replace(/\s*\(\s*\d+(?:\s*-\s*\d+)?\s*(?:\/|\s*of\s*)\s*\d+\s*(?:marks?|pts?)?\s*\)/gi, "");

  // Parenthesized marks like (1-2 marks), (3 marks), (0 marks)
  s = s.replace(/\s*\(\s*\d+(?:\s*-\s*\d+)?\s*(?:marks?|pts?)\s*\)/gi, "");

  // Numerical score phrases forbidden by Cambridge examiner feedback rules:
  // "held at 7", "held at 7 instead of 8", "kept at 7", "capped at 7", "instead of 8"
  s = s.replace(/\b(?:held|kept|capped|restricted)\s+at\s+\d+(?:\s*(?:\/|out\s+of)\s*\d+)?(?:\s+instead\s+of\s+\d+)?/gi, "");
  s = s.replace(/\binstead\s+of\s+\d+(?:\s*(?:\/|out\s+of)\s*\d+)?/gi, "");
  s = s.replace(/\bkeeping\s+the\s+(?:essay|mark|score)\s+at\s+\d+(?:\s*(?:\/|out\s+of)\s*\d+)?(?:\s+instead\s+of\s+\d+)?/gi, "");
  s = s.replace(/\bmaximum\s+\d+\s*\/\s*\d+\b/gi, "");
  s = s.replace(/\bmaximum\s+\d+\s+marks?\b/gi, "");

  // Punitive marks phrases: "cost you marks", "cost the student marks", "lost marks"
  s = s.replace(/\b(?:costs?|costing)\s+(?:you|the\s+candidate|the\s+student)?\s*marks?\b/gi, "limits the evaluation");
  s = s.replace(/\b(?:lose|loses|losing|lost)\s+marks?\b/gi, "limits credit");
  s = s.replace(/\bmarks?\s+(?:were|was|are|is)\s+lost\b/gi, "credit was restricted");

  // Standalone phrases like "restricted to 3/4" or "restrict the mark to 3/4" -> "restricted to this level"
  s = s.replace(/\b(?:restricts?|restricted|restricting)\s+(?:the\s+mark\s+)?to\s+\d+\s*\/\s*\d+\b/gi, "restricted to this level");
  s = s.replace(/\bachieves?\s+\d+\s*\/\s*\d+\s*marks?\b/gi, "demonstrates sound understanding");

  // Standalone fractions followed by marks: "3/4 marks", "1/4 marks"
  s = s.replace(/\b\d+\s*\/\s*\d+\s*marks?\b/gi, "credit");
  s = s.replace(/\b\d+\s*of\s*\d+\s*marks?\b/gi, "credit");

  // Expressions like "The single mark is awarded" -> "Credit is awarded"
  s = s.replace(/\b(?:The|A)\s+single\s+mark\s+is\s+awarded\b/gi, "Credit is awarded");
  s = s.replace(/\bOne\s+mark\s+is\s+awarded\b/gi, "Credit is awarded");
  s = s.replace(/\bfull\s+marks\s+are\s+awarded\b/gi, "full credit is awarded");
  s = s.replace(/\b\d+\s+marks?\s+are\s+awarded\b/gi, "Credit is awarded");
  s = s.replace(/\bmarks?\s+are\s+awarded\b/gi, "credit is awarded");
  s = s.replace(/\b\d+\s+marks?\s+for\s+AO(\d)\b/gi, "credit for AO$1");

  // Standalone score fractions like "3/4" or "1/4" or "7/8" when between 0 and 30
  s = s.replace(/\b(\d+)\s*\/\s*(\d+)\b/g, (match, p1, p2) => {
    const n1 = Number(p1);
    const n2 = Number(p2);
    if (n2 <= 30 && n1 <= n2) {
      return "";
    }
    return match;
  });

  // Paper 4 references in general prose
  s = s.replace(/\b(?:In\s+extended\s+)?Paper\s+4\s+essays?\b/gi, "In extended essays");

  // Clean up punctuation artifacts from removals
  s = s.replace(/\s+,/g, ",");
  s = s.replace(/\s+\./g, ".");
  s = s.replace(/,\s*,+/g, ",");
  s = s.replace(/\.\s*\.+/g, ".");
  s = s.replace(/,\s*\./g, ".");
  s = s.replace(/\(\s*\)/g, "");
  s = s.replace(/\(\s*,\s*\)/g, "");
  s = s.replace(/\(\s*\.\s*\)/g, "");
  s = s.replace(/\s{2,}/g, " ");
  s = s.replace(/^\s*[,.\-]\s*/, "");
  return s.trim();
}

/**
 * Strips internal knowledge-base retrieval chunk markers like [S1], [S2], (as per [S1]),
 * (see [S2], [S4]), (S1, S3), (S6) from student-facing feedback so internal pipeline
 * database markers never leak into student or teacher reports.
 */
export function stripInternalSnippetCitations(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  let s = value;

  // 1. Any parenthesis whose content contains S-chunk markers:
  // e.g. (as per [S1] and [S6]), (see [S2], [S4]), (S1, S3), (S6), ([S1], [S3], [S6]), (as required by [S3] and [S6])
  s = s.replace(/\s*\([^)]*?\bS\d+\b[^)]*?\)/gi, "");

  // 2. Prose snippet references: "as per [S1] and [S6]", "as required by [S3]", "see [S2]"
  s = s.replace(/\b(?:as\s+per|as\s+required\s+by|see)\s+\[?S\d+\]?(?:\s*(?:and|or|,)\s*\[?S\d+\]?)*/gi, "");

  // 3. Multiple or single bracketed citations: [S1] and [S6], [S1, S2], [S1]-[S6], [S1]
  s = s.replace(/\s*\[S\d+\](?:\s*(?:and|or|,)\s*\[S\d+\])*/gi, "");
  s = s.replace(/\s*\[S\d+(?:[\s,\-–and]+S\d+)*\]/gi, "");

  // 4. Standalone snippet tokens: S1, S2 if preceded by "snippet" or "chunk"
  s = s.replace(/\b(?:snippet|chunk)\s+S\d+\b/gi, "");

  // 5. Clean punctuation artifacts
  s = s.replace(/\s+([.,;:])/g, "$1");
  s = s.replace(/,\s*,+/g, ",");
  s = s.replace(/\.\s*\.+/g, ".");
  s = s.replace(/,\s*\./g, ".");
  s = s.replace(/\(\s*\)/g, "");
  s = s.replace(/\s{2,}/g, " ");
  s = s.replace(/^\s*[,.\-]\s*/, "");
  return s.trim();
}

// Generic stop words for semantic deduplication of feedback points
const FEEDBACK_STOP_WORDS = new Set([
  "the", "and", "that", "this", "with", "from", "for", "are", "was", "were",
  "been", "being", "have", "has", "had", "does", "did", "doing", "would",
  "should", "could", "ought", "their", "they", "them", "which", "what",
  "when", "where", "also", "into", "onto", "then", "than", "more", "most",
  "some", "such", "only", "even", "student", "candidate", "essay", "response",
  "economic", "economics", "analysis", "evaluation", "explanation", "explain",
  "explaining", "your", "about", "while", "however", "although", "through",
  "between", "whether", "further", "clear", "clearly", "provide", "provides",
  "providing", "include", "including", "ensure", "strengthen", "elevate",
  "improve", "deepen", "develop", "developed", "developing", "specific",
]);

function extractFeedbackStems(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !FEEDBACK_STOP_WORDS.has(w))
      .map((w) => w.replace(/(ations|ation|ings|ing|tion|ment|ities|ity|ness|ally|ed|ly|es|s)$/, ""))
      .filter((w) => w.length >= 3),
  );
}

/**
 * Computes Jaccard similarity and Overlap Coefficient (intersection / min(|A|, |B|))
 * on stemmed content words so a longer bullet with a quote is still recognised as
 * duplicating a shorter bullet on the exact same point.
 */
export function feedbackSimilarity(a: string, b: string): { jaccard: number; overlap: number } {
  const aWords = extractFeedbackStems(a);
  const bWords = extractFeedbackStems(b);
  if (aWords.size === 0 || bWords.size === 0) return { jaccard: 0, overlap: 0 };
  let intersection = 0;
  for (const w of aWords) {
    if (bWords.has(w)) intersection++;
  }
  const union = aWords.size + bWords.size - intersection;
  const minSize = Math.min(aWords.size, bWords.size);
  return {
    jaccard: union > 0 ? intersection / union : 0,
    overlap: minSize > 0 ? intersection / minSize : 0,
  };
}

/**
 * Deduplicates strings based on stemmed content-word Jaccard (>= 0.32) or
 * Overlap Coefficient (>= 0.50), preventing repetitive or near-duplicate feedback points.
 */
export function deduplicateFeedbackPoints(points: string[], maxCount = 4): string[] {
  const result: string[] = [];

  for (const point of points) {
    const trimmed = point.trim();
    if (!trimmed) continue;
    const exists = result.some((existing) => {
      const sim = feedbackSimilarity(existing, trimmed);
      return sim.jaccard >= 0.32 || sim.overlap >= 0.5;
    });
    if (!exists) {
      result.push(trimmed);
      if (result.length >= maxCount) break;
    }
  }

  return result;
}

/**
 * Verifies that text in quotes ('...' or "...") in examiner feedback actually exists in the student's essay.
 * If the quote does not exist in the essay (hallucinated quote), unwraps the quotes so the examiner
 * does not falsely attribute fabricated text as a verbatim student quote.
 */
export function verifyVerbatimQuotes(feedbackText: string, essayText?: string): string {
  if (!feedbackText || !essayText || typeof feedbackText !== "string" || typeof essayText !== "string") {
    return feedbackText;
  }

  const normEssay = essayText
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normEssay) return feedbackText;

  // Match properly paired quotes ("..." or '...') NOT embedded inside word apostrophes/possessives (e.g. theory's)
  return feedbackText.replace(/(?<!\w)(["'])([^\n\r]{8,}?)\1(?!\w)/g, (match, _quote: string, quotedContent: string) => {
    const normQuoted = quotedContent
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // If exact or normalized content is found verbatim in the essay, keep the quote
    if (normQuoted && normEssay.includes(normQuoted)) {
      return match;
    }

    // Allow minor OCR/punctuation differences ONLY if both high word match (>= 80%) AND
    // sequential bigram order (>= 60% of adjacent word pairs) actually appear in the essay
    const allTokens = normQuoted.split(" ").filter(Boolean);
    const words = allTokens.filter((w) => w.length > 3);
    if (words.length >= 3 && allTokens.length >= 3) {
      let matchedCount = 0;
      for (const w of words) {
        if (normEssay.includes(w)) matchedCount++;
      }
      let bigramMatches = 0;
      const totalBigrams = allTokens.length - 1;
      for (let i = 0; i < totalBigrams; i++) {
        if (normEssay.includes(`${allTokens[i]} ${allTokens[i + 1]}`)) {
          bigramMatches++;
        }
      }
      if (matchedCount / words.length >= 0.8 && bigramMatches / totalBigrams >= 0.6) {
        return match;
      }
    }

    // Phantom/paraphrased quote: unwrap quotes so non-verbatim text is not presented as a direct student quotation
    return quotedContent;
  });
}

/**
 * Programmatically sanitizes A-Level (A2) syllabus concepts and hallucinated definitional pedantry
 * out of AS Level (Paper 2, maxMark <= 12) examiner feedback.
 */
export function sanitizeAsLevelText(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  let s = value;

  // 1. Specific multi-word patterns from examiner reports (Scarcity & A-Level concepts)
  s = s.replace(
    /Explanation of how unlimited wants are economically defined \((?:e\.g\.,?\s*)?through marginal utility theory or diminishing returns\)\.?/gi,
    "Explanation of how unlimited wants persist despite high income as consumer desires expand to non-essential goods and services while resources remain finite.",
  );
  s = s.replace(
    /\((?:e\.g\.,?\s*)?through increased marginal wants, diminishing returns, or resource allocation trade-offs\)/gi,
    "(e.g., through increased consumer wants, finite factors of production, and opportunity cost trade-offs)",
  );
  s = s.replace(
    /(?:missing critical economic mechanisms like|missing key economic mechanisms such as)\s*(?:opportunity cost,\s*)?marginal utility,\s*diminishing returns,?\s*(?:or|and)?\s*resource allocation trade-offs/gi,
    "missing key economic mechanisms such as opportunity cost and resource allocation trade-offs",
  );
  s = s.replace(
    /(?:missing critical economic mechanisms like|missing key economic mechanisms such as)\s*marginal utility,\s*diminishing returns/gi,
    "missing key economic mechanisms like resource allocation trade-offs and opportunity cost",
  );
  s = s.replace(
    /(?:like|such as)\s*marginal utility,\s*diminishing returns,?\s*(?:or|and)?\s*/gi,
    "like opportunity cost, resource allocation trade-offs, or ",
  );

  // 2. Definitional hallucination & pedantry sanitization (Scarcity & Tautology claims)
  s = s.replace(
    /(?:The\s+definition\s+lacks\s+precision\s+and\s+syllabus\s+accuracy\.\s*)?The phrase ['"]limited resources['"] is (?:vague|imprecise)(?:\s+and\s+does\s+not\s+explicitly\s+reference[^\.\n\r]*)?\.?\s*/gi,
    "The definition identifies limited resources and unlimited wants; grounding this explicitly in finite factors of production will enhance syllabus precision. ",
  );
  s = s.replace(
    /The student (?:also )?incorrectly states ['"]Scarcity takes place when (?:the )?resources are limited but (?:the )?wants are unlimited['"](?:[—–\-,:]|\s*--\s*)this is a tautology and does not fully capture the economic concept of opportunity cost(?:\s*\([^)]*\))?\.?\s*/gi,
    "The candidate defines scarcity as limited resources versus unlimited wants; connecting choices directly to opportunity cost will deepen the response. ",
  );
  s = s.replace(
    /(?:The|This) definition of scarcity is (?:vague|imprecise)(?:\s+and\s+colloquial)? \(['"]resources are limited but wants are unlimited['"]\) and does not explicitly reference opportunity cost or the fundamental economic problem(?:\s*\(as required by [^)]+\))?\.?\s*/gi,
    "The definition of scarcity accurately identifies limited resources and unlimited wants; developing the link to opportunity cost will enhance syllabus precision. ",
  );
  s = s.replace(
    /(?:The|This) definition of scarcity is (?:vague|imprecise) and lacks syllabus precision\. The student does not explicitly reference the fundamental economic problem(?:\s*\([^)]+\))? or opportunity cost(?:\s*\([^)]+\))?,? which are core to answering the question\.?\s*/gi,
    "The definition of scarcity correctly identifies finite resources and unlimited wants; deepening the explanation with opportunity cost will enhance syllabus precision. ",
  );
  s = s.replace(
    /does not explicitly reference the fundamental economic problem of finite resources(?:\s*\(as per [^)]+\))?/gi,
    "can be further linked to finite factors of production and opportunity cost",
  );
  s = s.replace(
    /this is a tautology and does not fully capture the economic concept of opportunity cost/gi,
    "this foundational definition can be further enriched by linking choices to opportunity cost",
  );
  s = s.replace(/\bthis is a tautology\b/gi, "this is a foundational definition");
  s = s.replace(/\b(?:is\s+a\s+tautology)\b/gi, "is a foundational definition");
  s = s.replace(/\bis colloquial and does not align with syllabus terminology\b/gi, "can be expressed using formal syllabus terminology");
  s = s.replace(/\bdoes not align with syllabus terminology\b/gi, "can be developed using precise syllabus terminology");

  // 3. General A-Level (A2) concepts removal / replacement for AS Level
  s = s.replace(/\b(?:the\s+)?(?:law\s+of\s+)?diminishing\s+marginal\s+utility\b/gi, "consumer choice theory");
  s = s.replace(/\bmarginal\s+utility(?:\s+theory)?\b/gi, "consumer choice theory");
  s = s.replace(/\bequi[- ]marginal\s+(?:principle|utility)\b/gi, "consumer choice");
  s = s.replace(/\b(?:the\s+)?(?:law\s+of\s+)?diminishing\s+(?:marginal\s+)?returns\b/gi, "resource constraints and opportunity cost");
  s = s.replace(/\bdiminishing\s+returns\b/gi, "resource constraints");
  s = s.replace(/\bindifference\s+curves?(?:\s+and\s+budget\s+lines?)?\b/gi, "consumer demand analysis");
  s = s.replace(/\bbudget\s+lines?\b/gi, "income constraints");
  s = s.replace(/\boligopol(?:y|ies)\b/gi, "imperfect markets");
  s = s.replace(/\bmonopolistic\s+competition\b/gi, "imperfect competition");
  s = s.replace(/\bcontestabl(?:e|ity)\s+markets?\b/gi, "competitive markets");
  s = s.replace(/\bkinked\s+demand(?:\s+curve)?\b/gi, "price rigidity");
  s = s.replace(/\bgame\s+theory\b/gi, "strategic pricing");
  s = s.replace(/\bprice\s+discrimination\b/gi, "pricing policy");
  s = s.replace(/\bdynamic\s+efficienc(?:y|ies)\b/gi, "productive efficiency");
  s = s.replace(/\bx[- ]efficienc(?:y|ies)\b/gi, "productive efficiency");
  s = s.replace(/\bpareto\s+efficienc(?:y|ies)|pareto\s+optimal(?:ity)?\b/gi, "allocative efficiency");
  s = s.replace(/\bmarginal\s+revenue\s+product(?:ivity)?(?:\s+of\s+labou?r)?\b/gi, "labour productivity");
  s = s.replace(/\bmrpl\b/gi, "labour productivity");
  s = s.replace(/\bgini\s+coefficient\b/gi, "income inequality");
  s = s.replace(/\blorenz\s+curve\b/gi, "income distribution");
  s = s.replace(/\b(?:multiplier\s+formula|k\s*=\s*1\s*\/\s*(?:mpw|1\s*-\s*mpc))\b/gi, "the multiplier effect");
  s = s.replace(/\bexpectations[- ]augmented\s+phillips\s+curve\b/gi, "inflation-unemployment relationship");
  s = s.replace(/\bshort[- ]run\s+and\s+long[- ]run\s+phillips\s+curves?\b/gi, "Phillips curve analysis");
  s = s.replace(/\baccelerator\s+(?:principle|theory)\b/gi, "investment dynamics");
  s = s.replace(/\bquantity\s+theory\s+of\s+money|fisher\s+equation|mv\s*=\s*pt\b/gi, "monetary factors");
  s = s.replace(/\b(?:harrod[- ]domar|kuznets\s+curve|lewis\s+(?:dual[- ]sector\s+)?model)\b/gi, "economic development theory");
  s = s.replace(/\bmarshall[- ]lerner(?:\s+condition)?\b/gi, "elasticity of demand for exports and imports");
  s = s.replace(/\bj[- ]curve\b/gi, "balance of payments time lags");

  // 4. Clean grammatical artifacts
  s = s.replace(/\b(?:like|such as)\s+,\s*/gi, "like ");
  s = s.replace(/,\s*,+/g, ",");
  s = s.replace(/\.\s*\.+/g, ".");
  s = s.replace(/,\s*\./g, ".");
  s = s.replace(/\(\s*\)/g, "");
  s = s.replace(/\(\s*,\s*\)/g, "");
  s = s.replace(/\(\s*\.\s*\)/g, "");
  s = s.replace(/\s{2,}/g, " ");
  s = s.replace(/^\s*[,.\-]\s*/, "");
  return s.trim();
}

/**
 * Programmatically fixes syllabus labeling typos for 20-mark A Level (Paper 4) essays:
 * - 20-mark essays belong exclusively to A Level (Paper 4) rather than AS Level (Paper 21).
 * - Chapter 7 topics (Economic Efficiency and Utility Theory) are tagged as A Level (A2) rather than AS Level.
 * - Updates any lingering "AS Level" or "Paper 21" references in 20-mark feedback to "A Level" / "Paper 4".
 */
export function sanitizeALevelFeedbackText(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  let s = value;

  // 1. Properly label Chapter 7 as A Level (Economic Efficiency and Utility Theory)
  s = s.replace(
    /Chapter 7:\s*The Price System and the Microeconomy\s*\((?:Syllabus 9708,\s*)?AS Level,\s*Cambridge International Economics\)/gi,
    "Chapter 7: Economic Efficiency and Utility Theory (Syllabus 9708, A Level, Cambridge International Economics)",
  );
  s = s.replace(
    /Chapter 7:\s*The Price System and the Microeconomy\s*\((?:Syllabus 9708,\s*)?AS Level\)/gi,
    "Chapter 7: Economic Efficiency and Utility Theory (Syllabus 9708, A Level)",
  );
  s = s.replace(
    /Chapter 7:\s*The Price System and the Microeconomy\s*\(AS Level\)/gi,
    "Chapter 7: Economic Efficiency and Utility Theory (A Level / A2)",
  );
  s = s.replace(
    /Chapter 7:\s*The Price System and the Microeconomy/gi,
    "Chapter 7: Economic Efficiency and Utility Theory",
  );
  s = s.replace(
    /Chapter 7(?::\s*[^,\n\r()]+)?\s*\((?:Syllabus 9708,\s*)?AS Level,\s*Cambridge International Economics\)/gi,
    "Chapter 7: Economic Efficiency and Utility Theory (Syllabus 9708, A Level, Cambridge International Economics)",
  );
  s = s.replace(
    /Chapter 7(?::\s*[^,\n\r()]+)?\s*\((?:Syllabus 9708,\s*)?AS Level\)/gi,
    "Chapter 7: Economic Efficiency and Utility Theory (Syllabus 9708, A Level)",
  );
  s = s.replace(
    /Chapter 7(?::\s*[^,\n\r()]+)?\s*\(AS Level\)/gi,
    "Chapter 7: Economic Efficiency and Utility Theory (A Level / A2)",
  );
  s = s.replace(
    /Cambridge 9708 Chapter 7:\s*(?:Government microeconomic intervention|Maximum and minimum prices[^\n\r,]*)/gi,
    "Cambridge 9708 Chapter 7: Economic Efficiency and Utility Theory (A Level / Paper 4)",
  );

  // 2. Fix syllabus level tags for 20-mark essays: AS Level -> A Level
  s = s.replace(
    /\bChapter 5:\s*Market Failure and Government Intervention\s*\((?:Syllabus 9708,\s*)?(?:AS|A) Level(?:\s*,\s*Cambridge International Economics)?\)/gi,
    "Chapter 8: Market Failure and Government Failure (Syllabus 9708, A Level, Cambridge International Economics)",
  );
  s = s.replace(
    /\bChapter 5:\s*Market Failure and Government Intervention\s*\(Cambridge 9708 Coursebook\)/gi,
    "Chapter 8: Market Failure and Government Failure (Cambridge 9708 A Level Coursebook)",
  );
  s = s.replace(
    /\(Syllabus 9708,\s*AS Level,\s*Cambridge International Economics\)/gi,
    "(Syllabus 9708, A Level, Cambridge International Economics)",
  );
  s = s.replace(
    /\(Syllabus 9708,\s*AS Level\)/gi,
    "(Syllabus 9708, A Level)",
  );

  // 3. Fix Paper references: 20-mark essays are Paper 4 (A Level), never Paper 21 / Paper 2
  s = s.replace(/\bPaper 21 Essay Question Compendium\b/gi, "Paper 41 Essay Question Compendium");
  s = s.replace(/\bPaper 22 Essay Question Compendium\b/gi, "Paper 42 Essay Question Compendium");
  s = s.replace(/\bPaper 23 Essay Question Compendium\b/gi, "Paper 43 Essay Question Compendium");
  s = s.replace(/\bPaper 21\b/g, "Paper 41");
  s = s.replace(/\bPaper 22\b/g, "Paper 42");
  s = s.replace(/\bPaper 23\b/g, "Paper 43");
  s = s.replace(/\bPaper 2\b/g, "Paper 4");
  s = s.replace(/\bAS Level\b/gi, "A Level");

  return s;
}

export function cleanMarkdownText(value: unknown): string {
  if (typeof value !== "string") return "";
  let text = stripStars(value);
  text = stripScoreFractionsFromText(text);
  text = stripInternalSnippetCitations(text);
  // Repair trailing truncated fragments like "assertion (" or dangling colons/commas
  text = text.replace(/\s*\([^)]*$/, "");
  text = text.replace(/[,;:\-\s]+$/, "");
  return text.trim();
}

function cleanComment(comment: string): string {
  let cleaned = cleanMarkdownText(comment);
  if (cleaned.length > 0 && !/[.!?]$/.test(cleaned)) {
    cleaned += ".";
  }
  return cleaned;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanComment(typeof item === "string" ? item : JSON.stringify(item)))
    .filter((item) => item.length > 0);
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallback;
}

function normaliseAo(value: unknown, outOf: number): AoScore {
  const raw = (value ?? {}) as Record<string, unknown>;
  const declaredOutOf = toNumber(raw.out_of, outOf);
  return {
    awarded: Math.max(0, Math.min(declaredOutOf, Math.round(toNumber(raw.awarded, 0)))),
    out_of: declaredOutOf,
    comment: cleanComment(String(raw.comment ?? "")),
  };
}

/**
 * Coerce raw model JSON into a Grading. Enforces the fixed AO allocation:
 * the model is never allowed to redistribute marks or invent an `out_of`.
 */
export function normaliseGrading(
  raw: Record<string, unknown>,
  maxMark: number,
  split: { ao1_marks: number; ao2_marks: number; ao3_marks: number },
  essayText?: string,
  questionText?: string,
): Grading {
  const rawAo = (raw.ao_breakdown ?? {}) as Record<string, unknown>;

  const knowledge = normaliseAo(rawAo.knowledge ?? rawAo.ao1, split.ao1_marks);
  const analysis = normaliseAo(rawAo.analysis ?? rawAo.ao2, split.ao2_marks);
  const evaluation = normaliseAo(rawAo.evaluation ?? rawAo.ao3, split.ao3_marks);

  // The mark scheme owns the allocation, not the model.
  knowledge.out_of = split.ao1_marks;
  analysis.out_of = split.ao2_marks;
  evaluation.out_of = split.ao3_marks;
  knowledge.awarded = Math.min(knowledge.awarded, split.ao1_marks);
  analysis.awarded = Math.min(analysis.awarded, split.ao2_marks);
  evaluation.awarded = Math.min(evaluation.awarded, split.ao3_marks);

  // If question does not require evaluation (e.g. legacy 8-mark question), AO3 is strictly 0
  if (split.ao3_marks === 0) {
    evaluation.out_of = 0;
    evaluation.awarded = 0;
    evaluation.comment = "Evaluation is not required for this question. No marks are lost for its omission.";
  } else {
    // Evaluative essay: sanitize false claims that evaluation is not required
    if (/not required|non-evaluative/i.test(evaluation.comment)) {
      evaluation.comment = evaluation.comment
        .replace(/Evaluation is (strictly )?not required for this question as it is a non-evaluative ['"][^'"]*['"] question.s*/gi, "")
        .replace(/Evaluation is (strictly )?not required for this question.?s*/gi, "")
        .replace(/although this is not required for this question type.?s*/gi, "")
        .trim();

      if (!evaluation.comment) {
        evaluation.comment = "Evaluative reasoning and concluding judgement assessed against the question prompt.";
      }

      // If the examiner had awarded 0 marks solely due to the false belief that evaluation was not required,
      // but the candidate made an evaluative attempt or provided a conclusion / classification:
      if (
        evaluation.awarded === 0 &&
        /conclusion|judgement|judgment|classif|weigh|perspective|counter/i.test(evaluation.comment) &&
        !/no conclusion|unsupported|absent|lacks? (an? )?evaluation|not provided|wholly absent|no evaluative|superficial|fails? to|omission/i.test(evaluation.comment)
      ) {
        evaluation.awarded = 1;
      }
    }

    // For 8-mark evaluative essays, calibrate evaluation strictness to realistic Cambridge Section B standards:
    if (maxMark === 8 && split.ao3_marks === 2) {
      const mentionsConclusionOrClassification = /conclusion|judgement|judgment|classif/i.test(evaluation.comment);
      const mentionsBothAspectsOrSides = /both|merit.*public|public.*merit|two|rival|exclud|aspect|characteristic|perspective/i.test(evaluation.comment);

      // If the candidate demonstrates developed knowledge (2/2) and developed analysis (4/4),
      // and addressed both aspects with a concluding judgement, award full 2/2 marks:
      if (knowledge.awarded === 2 && analysis.awarded === 4 && (mentionsConclusionOrClassification || mentionsBothAspectsOrSides)) {
        if (evaluation.awarded < 2) {
          evaluation.awarded = 2;
        }
        // Clean up overly strict remarks demanding 12m/20m criteria
        evaluation.comment = evaluation.comment
          .replace(/A stronger evaluation would require[^.]*\./gi, "")
          .replace(/fails to weigh the trade-offs or justify why one classification dominates over the other\.?/gi, "The candidate provides a reasoned concluding classification grounded in their analysis.")
          .replace(/lacks depth and prioritization\.?/gi, "demonstrates sound evaluative judgement for an 8-mark response.")
          .replace(/The conclusion [^.]* is not fully substantiated by evaluative reasoning\.?/gi, "The conclusion directly addresses the evaluative directive with supporting reasoning.")
          .trim();
        if (!/sound|reasoned|level 2|accurate/i.test(evaluation.comment)) {
          evaluation.comment += " Sound evaluative reasoning addresses the prompt and reaches a supported concluding judgement.";
        }
      }
    }
  }

  const rawMissing = (raw.missing_elements ?? {}) as Record<string, unknown>;

  let strengths = toStringArray(raw.strengths);
  let weaknesses = toStringArray(raw.weaknesses);
  let actionableFeedback = toStringArray(raw.actionable_feedback);
  let suggestedResources = toStringArray(raw.suggested_resources);
  let suggestedPractice = toStringArray(raw.suggested_practice);
  let examinerSummary = cleanComment(String(raw.examiner_summary ?? ""));

  // Enforce deterministic consistency with mechanism_validation & incoherent-evaluation diagnoses:
  // 1. If the examiner explicitly flagged fatal_misconceptions_found=true AND core_mechanisms_sound=false,
  //    enforce official Cambridge Level 1 AO2 ceilings so broken/inverted scripts cannot drift into Level 2/3.
  const rawMech = (raw.mechanism_validation ?? null) as Record<string, unknown> | null;
  if (rawMech && rawMech.fatal_misconceptions_found === true && rawMech.core_mechanisms_sound === false) {
    const level1Ao2Cap = maxMark >= 20 ? 4 : maxMark === 12 ? 2 : 2;
    const level1Ao3Cap = maxMark >= 20 ? 2 : maxMark === 12 ? 1 : 1;
    if (analysis.awarded > level1Ao2Cap) analysis.awarded = level1Ao2Cap;
    if (split.ao3_marks > 0 && evaluation.awarded > level1Ao3Cap) evaluation.awarded = level1Ao3Cap;
  }

  // 2. If the examiner's own evaluation comment or weaknesses explicitly diagnose incoherent/absent evaluation,
  //    enforce consistent AO3 marks (0 on 8m, max 1 on 12m/20m) so prose and score never contradict.
  //    Also on 20m Paper 4: if the examiner explicitly diagnoses BOTH a major directional error AND generic/unweighted
  //    evaluation, enforce Level 1 caps (AO2 <= 4, AO3 <= 1) so prose ("lower middle/bottom band") matches the mark.
  if (split.ao3_marks > 0) {
    const fullDiagText = `${examinerSummary} ${analysis.comment} ${evaluation.comment} ${weaknesses.join(" ")}`;
    const evalDiagText = `${evaluation.comment} ${weaknesses.join(" ")}`;
    if (/\b(evaluation\s+is\s+(?:completely\s+)?(?:incoherent|absent|missing|non[- ]?existent)|incoherent(?:,\s+\w+)?\s+evaluation|no\s+creditable\s+evaluation)\b/i.test(evalDiagText)) {
      const incoherentCap = maxMark === 8 ? 0 : 1;
      if (evaluation.awarded > incoherentCap) evaluation.awarded = incoherentCap;
    } else if (maxMark >= 20) {
      const hasMajorDirectionalError = /\bmajor\s+directional\s+error\b|\binvert(?:s|ed)\s+(?:the\s+)?(?:causal|transmission|interest\s+rate|tax)\s+(?:chain|mechanism)\b/i.test(fullDiagText);
      const hasGenericOrUnweightedEval = /\b(evaluation\s+is\s+(?:generic|superficial|unweighted|undeveloped)|unweighted\s+(?:evaluation|conclusion|list\s+of\s+factors)|generic\s+conclusion)\b/i.test(fullDiagText);
      if (hasMajorDirectionalError) {
        if (analysis.awarded > 4) analysis.awarded = 4;
        if (evaluation.awarded > 1) evaluation.awarded = 1;
      } else if (hasGenericOrUnweightedEval && analysis.awarded <= 8) {
        // Level 2 Paper 4 scripts with generic/unweighted evaluation sit in Table B Level 1 (max 2-3/6), NOT 4/6
        const l2EvalCap = analysis.awarded <= 5 ? 2 : 3;
        if (evaluation.awarded > l2EvalCap) evaluation.awarded = l2EvalCap;
      }
    }
  }

  const aoTotal = knowledge.awarded + analysis.awarded + evaluation.awarded;
  // The AO marks are the source of truth; a stated total that disagrees is a
  // model arithmetic slip, not a separate judgement.
  const total = Math.max(0, Math.min(maxMark, aoTotal));
  // The awarded mark is the source of truth for the Cambridge grade band:
  // A score of 10-12/12 is strictly Top Band (Level 4), never Upper Middle or Lower.
  const band = bandFor(total, maxMark);

  // Ensure full-fledged feedback is ALWAYS provided to the student
  if (!examinerSummary || examinerSummary.length < 25) {
    if (split.ao3_marks === 0 || evaluation.awarded === 0) {
      examinerSummary = `This submission achieves a ${band} standard. The candidate demonstrates understanding across AO1 Knowledge and AO2 Analysis${evaluation.awarded === 0 && split.ao3_marks > 0 ? ", while evaluative reasoning is absent or uncredited (0 marks awarded for AO3)" : ""}. Arguments are structured, with opportunities to deepen causal transmission mechanisms in subsequent rewrites.`;
    } else {
      examinerSummary = `This submission achieves a ${band} standard. The candidate demonstrates sound economic understanding across AO1 Knowledge, AO2 Analysis, and AO3 Evaluation. Arguments are structured and address the prompt, with opportunities to deepen transmission mechanisms and comparative evaluation in subsequent rewrites.`;
    }
  }

  // Purge contradictory claims of "sound AO3 evaluation" when AO3 was awarded 0 marks
  if (evaluation.awarded === 0 && split.ao3_marks > 0) {
    examinerSummary = examinerSummary
      .replace(/AO1 Knowledge, AO2 Analysis, and AO3 Evaluation/gi, "AO1 Knowledge and AO2 Analysis, with evaluation absent")
      .replace(/across AO1, AO2, and AO3/gi, "across AO1 and AO2")
      .replace(/sound economic understanding across AO1 Knowledge, AO2 Analysis, and AO3 Evaluation/gi, "economic understanding across AO1 Knowledge and AO2 Analysis");
    strengths = strengths.filter(
      (s) => !/\b(balanced perspectives|sound evaluation|strong evaluat|evaluative breadth)\b/i.test(s)
    );
  }

  if (split.ao3_marks === 0) {
    // Strip any false claims of lost marks for missing evaluation on non-evaluative questions
    weaknesses = weaknesses.filter(
      (w) => !/\b(evaluation|evaluative|counter-argument|weighing|conclusion)\b/i.test(w),
    );
    actionableFeedback = actionableFeedback.filter(
      (f) => !/\b(evaluate|evaluation|evaluative|opposing argument|conclusion)\b/i.test(f),
    );
  } else {
    // Clean weaknesses, examiner summary, and actionable feedback of false claims that evaluation is not required
    weaknesses = weaknesses.map((w) =>
      w.replace(/,?\s*although this is not required for this question type/gi, "")
       .replace(/,?\s*even though evaluation is not required/gi, "")
       .trim()
    );
    examinerSummary = examinerSummary
      .replace(/,?\s*although this is not required for this question type/gi, "")
      .replace(/,?\s*even though evaluation is not required/gi, "")
      .trim();

    // When an 8-mark evaluative essay scores 8/8 (full marks), strip critical evaluation weaknesses
    // and replace over-strict recommendations
    if (maxMark === 8 && total === 8) {
      weaknesses = weaknesses.filter(
        (w) => !/equity|efficiency|administrative feasibility|prioritiz|underdeveloped|lacks depth/i.test(w)
      );
      actionableFeedback = actionableFeedback.filter(
        (f) => !/equity|efficiency|administrative feasibility|prioritize the most decisive/i.test(f)
      );
      examinerSummary = examinerSummary
        .replace(/However, the evaluation is underdeveloped[^.]*\./gi, "The evaluation is sound and reaches a supported concluding judgement in context.")
        .replace(/lacking a balanced weighing of criteria and a justified conclusion\.?/gi, "supported by contextual economic reasoning.")
        .replace(/requires deeper evaluative reasoning to reach Top Band standards\.?/gi, "fully achieves Top Band Cambridge standards.");
      if (weaknesses.length === 0) {
        weaknesses = [
          "Minor polish: In extended essays, you can further elaborate on long-run elasticity differences and funding trade-offs."
        ];
      }
    }
  }

  if (strengths.length === 0) {
    if (total <= Math.round(maxMark * 0.35)) {
      // Bottom Band: honest, calibrated feedback without false praise
      strengths = [
        "Attempts the question prompt and references relevant economic terminology.",
      ];
    } else {
      strengths = [
        `Accurate and appropriate use of economic terminology contextually applied.`,
        `Clear analytical reasoning establishing cause-and-effect links for core mechanisms.`,
      ];
      if (split.ao3_marks > 0 && evaluation.awarded > 0) {
        strengths.push(`Presents balanced perspectives addressing multiple dimensions of the prompt.`);
      }
    }
  }

  if (weaknesses.length === 0) {
    weaknesses = [
      "Economic transmission mechanisms can be extended further to connect intermediate changes with final macroeconomic and welfare outcomes.",
      "Substantiating theoretical arguments with concrete context or specific scenarios would elevate the answer to the top band.",
    ];
    if (split.ao3_marks > 0) {
      weaknesses.splice(
        1,
        0,
        "Evaluation could be deepened by explicitly weighing opposing arguments on a shared criterion such as time frame, elasticity, or relative magnitude.",
      );
    }
  }

  if (actionableFeedback.length === 0) {
    actionableFeedback = [
      "Explicitly articulate every step in your economic chains of reasoning: define the initial shock, explain the transmission mechanism, analyse market adjustments, and explain final economic impacts.",
    ];
    if (split.ao3_marks > 0) {
      actionableFeedback.push(
        "Weigh opposing arguments against explicit economic criteria (e.g. short run vs long run, elasticity, degree of dependency) before forming a conclusion.",
        "Ensure the conclusion directly confronts the question's qualifiers and command words with a justified, context-dependent judgement.",
      );
    } else {
      actionableFeedback.push(
        "Provide precise definitions for every economic term referenced and unpack each link of the cause-and-effect chain in separate sentences.",
      );
    }
  }

  // Dynamic topic-accurate syllabus chapter detection (eliminates generic placeholders)
  const fullFeedbackText = `${examinerSummary} ${essayText || ""} ${questionText || ""}`.toLowerCase();
  const isElasticity = /\b(elasticit|xed|ped|yed|pes|substitute|complement|cross\s+elasticity)\b/i.test(fullFeedbackText);
  const isScarcity = /\b(scarcit|finite resource|unlimited want|opportunity cost|production possibilit|ppc)\b/i.test(fullFeedbackText);
  const isEfficiency = /\b(economic efficiency|allocative eff|productive eff|pareto|deadweight loss)\b/i.test(fullFeedbackText);
  const isMarketFailure = /\b(market failure|externalit|public good|merit good|demerit good|asymmetric information)\b/i.test(fullFeedbackText);
  const isPriceControls = /\b(maximum price|minimum price|indirect tax|subsidy|price ceiling|price floor)\b/i.test(fullFeedbackText);
  const isTradeExchange = /\b(exchange rate|current account|balance of payments|depreciation|appreciation|tariff|protectionism)\b/i.test(fullFeedbackText);
  const isInflation = /\b(inflation|deflation|cpi|cost-push|demand-pull|price stability)\b/i.test(fullFeedbackText);
  const isMacroAdAs = /\b(aggregate demand|aggregate supply|macroeconomic|fiscal policy|monetary policy)\b/i.test(fullFeedbackText);
  const isMarketStructure = /\b(monopol|oligopol|contestabl|perfect competition|collusion|barrier to entry)\b/i.test(fullFeedbackText);

  // If suggestedResources is empty or contains generic placeholders, populate topic-specific chapters
  if (
    suggestedResources.length === 0 ||
    suggestedResources.some((r) => /relevant chapter|core theory & policy/i.test(r))
  ) {
    suggestedResources = suggestedResources.filter(
      (r) => !/relevant chapter|core theory & policy/i.test(r),
    );
    if (suggestedResources.length === 0) {
      if (maxMark >= 20) {
        if (isEfficiency || isMarketFailure || isPriceControls) {
          suggestedResources = [
            "Cambridge 9708 Chapter 7: Economic Efficiency and Utility Theory (A Level / Paper 4)",
            "Cambridge 9708 Chapter 8: Market Failure and Government Failure (A Level / Paper 4)",
          ];
        } else if (isMarketStructure) {
          suggestedResources = [
            "Cambridge 9708 Chapter 7: Economic Efficiency and Utility Theory (A Level / Paper 4)",
            "Cambridge 9708 Chapter 9: Market Structures and Contestability (A Level / Paper 4)",
          ];
        } else if (isMacroAdAs || isInflation) {
          suggestedResources = [
            "Cambridge 9708 Chapter 10: Macroeconomic Management and Policy Options (A Level / Paper 4)",
            "Cambridge 9708 Chapter 11: Monetary and Supply-Side Policies (A Level / Paper 4)",
          ];
        } else if (isTradeExchange) {
          suggestedResources = [
            "Cambridge 9708 Chapter 12: International Economic Issues (A Level / Paper 4)",
            "Cambridge 9708 Chapter 11: Exchange Rates and Globalization (A Level / Paper 4)",
          ];
        } else {
          suggestedResources = [
            "Cambridge 9708 Chapter 7: Economic Efficiency and Utility Theory (A Level / Paper 4)",
            "Official Cambridge 9708 Paper 4 Examiner Guidance for Extended Essay Questions",
          ];
        }
      } else if (isElasticity) {
        suggestedResources = [
          "Cambridge 9708 Chapter 8: Price elasticity of demand and supply",
          "Cambridge 9708 Chapter 9: Income and cross elasticities of demand",
        ];
      } else if (isScarcity) {
        suggestedResources = [
          "Cambridge 9708 Chapter 1: Scarcity, choice and opportunity cost",
          "Cambridge 9708 Chapter 2: Production Possibility Curves (PPC)",
        ];
      } else if (isTradeExchange) {
        suggestedResources = [
          "Cambridge 9708 Chapter 14: Exchange rates and the balance of payments",
          "Cambridge 9708 Chapter 15: International trade and protectionism",
        ];
      } else if (isMarketFailure) {
        suggestedResources = [
          "Cambridge 9708 Chapter 6: Market failure, public goods and externalities",
          "Cambridge 9708 Chapter 7: Government microeconomic intervention",
        ];
      } else if (isPriceControls) {
        suggestedResources = [
          "Cambridge 9708 Chapter 7: Maximum and minimum prices, taxes and subsidies",
          "Cambridge 9708 Chapter 5: Price determination and market equilibrium",
        ];
      } else if (isInflation) {
        suggestedResources = [
          "Cambridge 9708 Chapter 12: Inflation and price stability",
          "Cambridge 9708 Chapter 11: Macroeconomic indicators",
        ];
      } else if (isMacroAdAs) {
        suggestedResources = [
          "Cambridge 9708 Chapter 11: Aggregate demand and aggregate supply analysis",
          "Cambridge 9708 Chapter 12: Fiscal and monetary policy management",
        ];
      } else if (isMarketStructure) {
        suggestedResources = [
          "Cambridge 9708 Chapter 17: Market structures and competitive behaviour",
          "Cambridge 9708 Chapter 18: Contestability and monopoly power",
        ];
      } else {
        suggestedResources = [
          "Cambridge 9708 Economics Coursebook — Core Principles and Microeconomic Foundations",
          "Official Cambridge 9708 Examiner Guidance for Essay Questions",
        ];
      }
    }
  }

  // Purge hallucinated policy intervention prompts in suggested_practice when question is on elasticity/markets
  suggestedPractice = suggestedPractice.filter(
    (p) => !/connecting policy implementation to consumer and producer surplus/i.test(p),
  );

  // If suggestedPractice is empty or needs topic-aligned exercises:
  if (suggestedPractice.length < 2) {
    if (isElasticity) {
      if (!suggestedPractice.some((p) => /elasticity|pricing|substitute|xed/i.test(p))) {
        suggestedPractice.push(
          "Evaluate how a firm uses knowledge of high positive XED between its product and a competitor's substitute to respond to an aggressive rival price cut.",
          "Write a 4-mark evaluative paragraph considering how non-price determinants (such as brand loyalty and advertising) limit the practical usefulness of XED estimates.",
        );
      }
    } else if (isScarcity) {
      if (!suggestedPractice.some((p) => /scarcity|opportunity cost|ppc/i.test(p))) {
        suggestedPractice.push(
          "Explain why high national income levels in developed economies do not eliminate the fundamental economic problem of scarcity.",
          "Construct a concise evaluative paragraph analyzing the opportunity cost faced by governments when allocating finite resources.",
        );
      }
    } else if (isTradeExchange) {
      if (!suggestedPractice.some((p) => /exchange rate|current account|j-curve/i.test(p))) {
        suggestedPractice.push(
          "Explain how the Marshall-Lerner condition and the J-curve effect determine whether currency depreciation successfully improves the current account.",
          "Evaluate the trade-off between improving export competitiveness through depreciation and the risk of imported cost-push inflation.",
        );
      }
    } else {
      if (suggestedPractice.length === 0) {
        suggestedPractice = [
          "Write a focused evaluative paragraph directly comparing the relative significance of short-run versus long-run impacts for this prompt.",
          "Construct a step-by-step transmission mechanism connecting the initial economic change to final equilibrium and stakeholder outcomes.",
        ];
      }
    }
  }

  // Deduplicate near-duplicate feedback points across passes and models
  strengths = deduplicateFeedbackPoints(strengths, 4);
  weaknesses = deduplicateFeedbackPoints(weaknesses, 4);
  actionableFeedback = deduplicateFeedbackPoints(actionableFeedback, 4);

  // Verbatim quote verification: prevents examiner feedback from enclosing phantom phrases in quotes
  if (essayText) {
    knowledge.comment = verifyVerbatimQuotes(knowledge.comment, essayText);
    analysis.comment = verifyVerbatimQuotes(analysis.comment, essayText);
    evaluation.comment = verifyVerbatimQuotes(evaluation.comment, essayText);
    examinerSummary = verifyVerbatimQuotes(examinerSummary, essayText);
    strengths = strengths.map((s) => verifyVerbatimQuotes(s, essayText));
    weaknesses = weaknesses.map((w) => verifyVerbatimQuotes(w, essayText));
    actionableFeedback = actionableFeedback.map((f) => verifyVerbatimQuotes(f, essayText));
  }

  // Programmatic AS Level (Paper 2, maxMark <= 12) Sanitization:
  // Purges any hallucinated A-Level topics (marginal utility, diminishing returns, etc.)
  // and definitional pedantry/tautology claims from student-facing feedback.
  if (maxMark <= 12) {
    knowledge.comment = sanitizeAsLevelText(knowledge.comment);
    analysis.comment = sanitizeAsLevelText(analysis.comment);
    evaluation.comment = sanitizeAsLevelText(evaluation.comment);
    examinerSummary = sanitizeAsLevelText(examinerSummary);
    strengths = deduplicateFeedbackPoints(strengths.map(sanitizeAsLevelText).filter((s) => s.length > 0), 4);
    weaknesses = deduplicateFeedbackPoints(weaknesses.map(sanitizeAsLevelText).filter((w) => w.length > 0), 4);
    actionableFeedback = deduplicateFeedbackPoints(actionableFeedback.map(sanitizeAsLevelText).filter((f) => f.length > 0), 4);
    suggestedResources = Array.from(new Set(suggestedResources.map(sanitizeAsLevelText).filter((r) => r.length > 0))).slice(0, 3);
    suggestedPractice = Array.from(new Set(suggestedPractice.map(sanitizeAsLevelText).filter((p) => p.length > 0))).slice(0, 3);
  }

  // Programmatic A Level (Paper 4, maxMark >= 20) Sanitization:
  // Fixes syllabus labeling typos so Chapter 7 topics (Economic Efficiency and Utility Theory)
  // are properly tagged as A Level (A2) rather than AS Level, and Paper 21 references map to Paper 4.
  if (maxMark >= 20) {
    knowledge.comment = sanitizeALevelFeedbackText(knowledge.comment);
    analysis.comment = sanitizeALevelFeedbackText(analysis.comment);
    evaluation.comment = sanitizeALevelFeedbackText(evaluation.comment);
    examinerSummary = sanitizeALevelFeedbackText(examinerSummary);
    strengths = deduplicateFeedbackPoints(strengths.map(sanitizeALevelFeedbackText).filter((s) => s.length > 0), 4);
    weaknesses = deduplicateFeedbackPoints(weaknesses.map(sanitizeALevelFeedbackText).filter((w) => w.length > 0), 4);
    actionableFeedback = deduplicateFeedbackPoints(actionableFeedback.map(sanitizeALevelFeedbackText).filter((f) => f.length > 0), 4);
    suggestedResources = Array.from(new Set(suggestedResources.map(sanitizeALevelFeedbackText).filter((r) => r.length > 0))).slice(0, 3);
    suggestedPractice = Array.from(new Set(suggestedPractice.map(sanitizeALevelFeedbackText).filter((p) => p.length > 0))).slice(0, 3);
  }

  const rawDefs = toStringArray(rawMissing.definitions);
  const rawAna = toStringArray(rawMissing.analysis);
  const rawEval = split.ao3_marks === 0 ? [] : toStringArray(rawMissing.evaluation);
  const rawEx = toStringArray(rawMissing.examples);
  const rawDiag = toStringArray(rawMissing.diagrams);

  let missingDefinitions =
    maxMark <= 12
      ? rawDefs.map(sanitizeAsLevelText).filter((d) => d.length > 0)
      : maxMark >= 20
        ? rawDefs.map(sanitizeALevelFeedbackText).filter((d) => d.length > 0)
        : rawDefs;
  let missingAnalysis =
    maxMark <= 12
      ? rawAna.map(sanitizeAsLevelText).filter((a) => a.length > 0)
      : maxMark >= 20
        ? rawAna.map(sanitizeALevelFeedbackText).filter((a) => a.length > 0)
        : rawAna;
  let missingEvaluation =
    split.ao3_marks === 0
      ? []
      : maxMark <= 12
        ? rawEval.map(sanitizeAsLevelText).filter((e) => e.length > 0)
        : maxMark >= 20
          ? rawEval.map(sanitizeALevelFeedbackText).filter((e) => e.length > 0)
          : rawEval;
  let missingExamples =
    maxMark <= 12
      ? rawEx.map(sanitizeAsLevelText).filter((ex) => ex.length > 0)
      : maxMark >= 20
        ? rawEx.map(sanitizeALevelFeedbackText).filter((ex) => ex.length > 0)
        : rawEx;
  let missingDiagrams =
    maxMark <= 12
      ? rawDiag.map(sanitizeAsLevelText).filter((di) => di.length > 0)
      : maxMark >= 20
        ? rawDiag.map(sanitizeALevelFeedbackText).filter((di) => di.length > 0)
        : rawDiag;

  if (essayText) {
    missingDefinitions = missingDefinitions.map((d) => verifyVerbatimQuotes(d, essayText));
    missingAnalysis = missingAnalysis.map((a) => verifyVerbatimQuotes(a, essayText));
    missingEvaluation = missingEvaluation.map((e) => verifyVerbatimQuotes(e, essayText));
    missingExamples = missingExamples.map((ex) => verifyVerbatimQuotes(ex, essayText));
  }

  missingDefinitions = deduplicateFeedbackPoints(missingDefinitions, 2);
  missingAnalysis = deduplicateFeedbackPoints(missingAnalysis, 2);
  missingEvaluation = deduplicateFeedbackPoints(missingEvaluation, 2);
  missingExamples = deduplicateFeedbackPoints(missingExamples, 2);
  missingDiagrams = deduplicateFeedbackPoints(missingDiagrams, 2);

  const normalized: Grading = cleanStars(purgeContradictions({
    total_mark: total,
    max_mark: maxMark,
    band,
    ao_breakdown: { knowledge, analysis, evaluation },
    examiner_summary: examinerSummary,
    strengths,
    weaknesses,
    missing_elements: {
      ...EMPTY_MISSING,
      definitions: missingDefinitions,
      analysis: missingAnalysis,
      evaluation: missingEvaluation,
      examples: missingExamples,
      diagrams: missingDiagrams,
    },
    actionable_feedback: actionableFeedback,
    suggested_resources: suggestedResources,
    suggested_practice: suggestedPractice,
    confidence: Math.max(0, Math.min(1, toNumber(raw.confidence, 0.9))),
    audited: false,
    sources: [],
    anchorsUsed: 0,
    off_syllabus: Boolean(raw.off_syllabus),
    detected_subject: typeof raw.detected_subject === "string" ? raw.detected_subject : undefined,
    grounding_status:
      raw.grounding_status === "mark_scheme_image" || raw.grounding_status === "unanchored"
        ? raw.grounding_status
        : "grounded",
  }));

  return deduplicateAcrossSections(normalized, questionText);
}

export function bandFor(total: number, maxMark: number): string {
  const ratio = maxMark > 0 ? total / maxMark : 0;
  if (ratio >= 0.8) return "Top Band";
  if (ratio >= 0.55) return "Upper Middle Band";
  if (ratio >= 0.35) return "Lower Middle Band";
  return "Bottom Band";
}

/**
 * Automatically resolves internal contradictions between strengths and weaknesses / missing elements:
 * - If an example (e.g. real-world, Singapore, UK, healthcare, context) is praised in strengths,
 *   purges any weakness or missing element claiming examples are missing, weak, or inadequate.
 * - If definitions are praised in strengths, purges any weakness or missing element claiming
 *   definitions are missing or vague.
 * - If evaluation/conclusions are praised or awarded full marks, purges any weakness or missing
 *   element claiming evaluation or conclusions are absent.
 */
export function purgeContradictions(grading: Grading): Grading {
  const strengthsJoined = grading.strengths.join(" ").toLowerCase();

  const praisesExamples =
    /(?:real[- ]world|concrete|contextual|practical)\s+(?:example|application|case|illustration)|(?:example|application)\s+of\b|\bfor example\b|\bsuch as\b/i.test(
      strengthsJoined,
    );

  const praisesDefinitions =
    /(?:correctly|accurately)\s+(?:identifies|defines|explains the meaning)|foundational\s+definition|syllabus\s+definition|core idea of/i.test(
      strengthsJoined,
    );

  const fullEvaluation =
    grading.ao_breakdown.evaluation.out_of > 0 &&
    grading.ao_breakdown.evaluation.awarded === grading.ao_breakdown.evaluation.out_of;

  let weaknesses = [...grading.weaknesses];
  let missingExamples = [...(grading.missing_elements.examples || [])];
  let missingDefinitions = [...(grading.missing_elements.definitions || [])];
  let missingEvaluation = [...(grading.missing_elements.evaluation || [])];

  if (praisesExamples) {
    weaknesses = weaknesses.filter(
      (w) =>
        !/\b(lacks?|missing|no|without|underdeveloped)\s+(?:real[- ]world\s+)?examples?\b/i.test(w) &&
        !/\bexamples?\s+(?:are|is)\s+(?:lacking|missing|underdeveloped|absent|weak)\b/i.test(w) &&
        !/\bmissing\s+critical\s+economic\s+mechanisms\s+like.*example/i.test(w),
    );
    missingExamples = [];
  }

  if (praisesDefinitions) {
    weaknesses = weaknesses.filter(
      (w) =>
        !/\b(lacks?|missing|did not|failed to)\s+(?:define|definition|reference the fundamental)\b/i.test(w),
    );
    missingDefinitions = [];
  }

  if (fullEvaluation) {
    weaknesses = weaknesses.filter(
      (w) =>
        !/\b(evaluation|concluding judgement|conclusion)\s+(?:is\s+)?(?:missing|lacking|absent|underdeveloped|fails? to)\b/i.test(w),
    );
    missingEvaluation = [];
  }

  // Ensure weaknesses list doesn't end up empty if all were filtered
  if (weaknesses.length === 0) {
    weaknesses = [
      "To elevate your score further, expand your transmission mechanisms to link intermediate market shifts to long-term welfare outcomes.",
    ];
  }

  return {
    ...grading,
    weaknesses,
    missing_elements: {
      ...grading.missing_elements,
      examples: missingExamples,
      definitions: missingDefinitions,
      evaluation: missingEvaluation,
    },
  };
}

/**
 * Eliminates repetition BOTH within every array and across report sections
 * (`weaknesses`, `missing_elements.*`, `actionable_feedback`), enforces the
 * Cambridge diagram rule when the prompt didn't ask for a diagram, and ensures
 * Top Band reports never tell the student "to reach Top Band".
 */
export function deduplicateAcrossSections(grading: Grading, questionText?: string): Grading {
  const asksDiagram = questionText
    ? /\b(diagram|graph|curve|pay[- ]?off\s+matrix)\b/i.test(questionText)
    : false;

  const isUnrequestedDiagramCritique = (text: string): boolean => {
    if (asksDiagram) return false;
    return (
      /\b(?:absence|lack|omission)\s+of\s+(?:a\s+|an\s+|any\s+)?(?:well-labeled\s+|labeled\s+|clear\s+)?diagrams?\b/i.test(text) ||
      /\b(?:include|add|draw|insert)\s+(?:a\s+|an\s+)?(?:well-labeled\s+|labeled\s+|clear\s+)?(?:demand\s+and\s+supply\s+|ad\/as\s+|economic\s+)?diagrams?\b/i.test(text) ||
      /\bwithout\s+(?:a\s+|any\s+)?diagrams?\b/i.test(text)
    );
  };

  const fixTopBandPhrasing = (text: string): string => {
    if (grading.band !== "Top Band") return text;
    return text
      .replace(/\bto\s+(?:reach|achieve|enter|elevate\s+(?:the\s+)?(?:analysis|evaluation|essay|response)\s+to)\s+(?:the\s+)?top\s+band\b/gi, "to push toward full marks")
      .replace(/\bin\s+order\s+to\s+reach\s+(?:the\s+)?top\s+band\b/gi, "to push toward full marks");
  };

  const strengths = deduplicateFeedbackPoints(
    (grading.strengths || []).map(fixTopBandPhrasing),
    4,
  );

  let weaknesses = deduplicateFeedbackPoints(
    (grading.weaknesses || [])
      .filter((w) => !isUnrequestedDiagramCritique(w))
      .map(fixTopBandPhrasing),
    4,
  );

  // Filter any missing_elements item that repeats an already-stated weakness or another missing item
  const seenMissing: string[] = [];
  const filterMissingList = (items: string[]): string[] => {
    const out: string[] = [];
    for (const raw of deduplicateFeedbackPoints(items || [], 2)) {
      const cleaned = fixTopBandPhrasing(raw);
      if (!cleaned || isUnrequestedDiagramCritique(cleaned)) continue;
      const repeatsWeakness = weaknesses.some((w) => {
        const sim = feedbackSimilarity(w, cleaned);
        return sim.jaccard >= 0.30 || sim.overlap >= 0.48;
      });
      const repeatsEarlierMissing = seenMissing.some((m) => {
        const sim = feedbackSimilarity(m, cleaned);
        return sim.jaccard >= 0.30 || sim.overlap >= 0.48;
      });
      if (!repeatsWeakness && !repeatsEarlierMissing) {
        out.push(cleaned);
        seenMissing.push(cleaned);
      }
    }
    return out;
  };

  const missingElements: MissingElements = {
    definitions: filterMissingList(grading.missing_elements?.definitions || []),
    analysis: filterMissingList(grading.missing_elements?.analysis || []),
    evaluation:
      grading.ao_breakdown.evaluation.out_of === 0
        ? []
        : filterMissingList(grading.missing_elements?.evaluation || []),
    examples: filterMissingList(grading.missing_elements?.examples || []),
    diagrams: asksDiagram ? filterMissingList(grading.missing_elements?.diagrams || []) : [],
  };

  // Deduplicate actionable_feedback internally (stricter overlap + shared evaluation-action prefix check)
  // AND against weaknesses/missing_elements so two bullets never give the same advice twice
  const dedupedRawActions: string[] = [];
  for (const item of (grading.actionable_feedback || []).filter((a) => !isUnrequestedDiagramCritique(a)).map(fixTopBandPhrasing)) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const isDup = dedupedRawActions.some((existing) => {
      const sim = feedbackSimilarity(existing, trimmed);
      if (sim.jaccard >= 0.28 || sim.overlap >= 0.44) return true;
      // Catch pairs that both tell the student to "rank/prioritize in the evaluation" or "add a counter-argument in the evaluation"
      const bothRankEval =
        /\b(?:in\s+(?:the|your)\s+evaluation|conclusion).*\b(?:rank|prioriti[sz]e|most\s+decisive)\b/i.test(existing) &&
        /\b(?:in\s+(?:the|your)\s+evaluation|conclusion).*\b(?:rank|prioriti[sz]e|most\s+decisive)\b/i.test(trimmed);
      const bothCounterEval =
        /\bevaluation\b.*\bcounter[- ]?argument\b/i.test(existing) &&
        /\bevaluation\b.*\bcounter[- ]?argument\b/i.test(trimmed);
      return bothRankEval || bothCounterEval;
    });
    if (!isDup) {
      dedupedRawActions.push(trimmed);
      if (dedupedRawActions.length >= 4) break;
    }
  }
  const rawActions = dedupedRawActions;

  const distinctActions = rawActions.filter((action) => {
    const repeatsWeakness = weaknesses.some((w) => {
      const sim = feedbackSimilarity(w, action);
      return sim.jaccard >= 0.34 || sim.overlap >= 0.52;
    });
    const repeatsMissing = seenMissing.some((m) => {
      const sim = feedbackSimilarity(m, action);
      return sim.jaccard >= 0.34 || sim.overlap >= 0.52;
    });
    return !repeatsWeakness && !repeatsMissing;
  });

  // Always keep at least 1 actionable step (pick the least-overlapping one if all were near-duplicates)
  let actionableFeedback = distinctActions.slice(0, 3);
  if (actionableFeedback.length === 0 && rawActions.length > 0) {
    const ranked = rawActions
      .map((a) => ({
        a,
        maxSim: Math.max(
          0,
          ...weaknesses.map((w) => feedbackSimilarity(w, a).overlap),
          ...seenMissing.map((m) => feedbackSimilarity(m, a).overlap),
        ),
      }))
      .sort((x, y) => x.maxSim - y.maxSim);
    actionableFeedback = [ranked[0].a];
  }

  if (weaknesses.length === 0 && grading.weaknesses?.length > 0) {
    weaknesses = [fixTopBandPhrasing(grading.weaknesses[0])];
  }

  // Final pass: strip any missing_elements checklist bullet that repeats a kept actionable_feedback step
  const stripActionDupes = (items: string[]): string[] =>
    items.filter(
      (m) =>
        !actionableFeedback.some((a) => {
          const sim = feedbackSimilarity(m, a);
          return sim.jaccard >= 0.34 || sim.overlap >= 0.50;
        }),
    );

  const finalMissingElements: MissingElements = {
    definitions: stripActionDupes(missingElements.definitions),
    analysis: stripActionDupes(missingElements.analysis),
    evaluation: stripActionDupes(missingElements.evaluation),
    examples: stripActionDupes(missingElements.examples),
    diagrams: stripActionDupes(missingElements.diagrams),
  };

  return {
    ...grading,
    examiner_summary: fixTopBandPhrasing(grading.examiner_summary),
    ao_breakdown: {
      knowledge: {
        ...grading.ao_breakdown.knowledge,
        comment: fixTopBandPhrasing(grading.ao_breakdown.knowledge.comment),
      },
      analysis: {
        ...grading.ao_breakdown.analysis,
        comment: fixTopBandPhrasing(grading.ao_breakdown.analysis.comment),
      },
      evaluation: {
        ...grading.ao_breakdown.evaluation,
        comment: fixTopBandPhrasing(grading.ao_breakdown.evaluation.comment),
      },
    },
    strengths,
    weaknesses,
    missing_elements: finalMissingElements,
    actionable_feedback: actionableFeedback,
  };
}

