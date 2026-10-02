/**
 * The Review Panel — a single AI pass that looks across a student's recent
 * essay grades AND recent MCQ papers together (not one essay/paper in
 * isolation, which every other tool already does) and writes an aggregate
 * diagnosis: recurring strengths, recurring weaknesses tied to evidence,
 * an AO1/AO2/AO3 trend, the weakest MCQ topics, and a prioritised "what to
 * do next" plan.
 *
 * Gated behind a minimum sample size (5 graded essays + 2 completed MCQ
 * papers) because a synthesis over 1 essay is just that essay's feedback
 * restated — the whole point is spotting a *pattern* across attempts.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { chat } from "./ai.server";
import { MODEL_ANALYSIS } from "./examiner/config";
import { extractFirstJsonObject } from "./examiner/json";
import type { Grading } from "./examiner/types";
import { aggregateMcqDomains, MCQ_DOMAIN_LABEL, type DomainStat } from "./mcq-domain";

export const MIN_ESSAYS_FOR_REVIEW = 5;
export const MIN_MCQ_PAPERS_FOR_REVIEW = 2;

// How much history actually feeds the synthesis once unlocked — a wider
// window than the unlock threshold so the pattern has real signal, capped
// so the prompt stays a sane size.
const ESSAY_WINDOW = 12;
const MCQ_WINDOW = 8;

type EssaySummary = {
  essayId: string;
  question: string;
  maxMark: number;
  totalMark: number;
  band: string;
  aoBreakdown: Grading["ao_breakdown"];
  strengths: string[];
  weaknesses: string[];
  missingElements: Grading["missing_elements"];
  createdAt: string;
};

export type ReviewPanelResult = {
  eligible: true;
  essayCount: number;
  mcqPaperCount: number;
  generatedAt: string;
  overallSummary: string;
  gradeTrend: "improving" | "steady" | "declining" | "not enough data";
  aoAnalysis: {
    ao: "AO1 Knowledge" | "AO2 Analysis" | "AO3 Evaluation";
    averagePercent: number;
    comment: string;
  }[];
  keyStrengths: { title: string; detail: string }[];
  keyWeaknesses: { title: string; detail: string; evidence: string }[];
  weakMcqTopics: { topic: string; accuracyPercent: number }[];
  /** SAT-"Reading vs Writing" style two-section MCQ split — see mcq-domain.ts. */
  mcqDomainBreakdown: DomainStat[];
  actionPlan: { priority: number; action: string; why: string; tool: ReviewTool }[];
  encouragement: string;
};

export type ReviewTool =
  | "grade"
  | "practice"
  | "response-structure"
  | "essay-generator"
  | "diagrams"
  | "mcq"
  | "question-bank";

export type ReviewPanelEligibility = {
  eligible: false;
  essayCount: number;
  mcqPaperCount: number;
  essaysNeeded: number;
  mcqPapersNeeded: number;
};

const CLICHE_BAN = `
Every string in this response is read by one real student about their own
work — write like a specific teacher who actually looked at this specific
record, not like a template. Concretely:
- Never use stock phrases: "keep up the good work", "practice makes
  perfect", "room for improvement", "great job", "you're on the right
  track", "don't give up", "believe in yourself", or any close paraphrase
  of them.
- Never write a sentence that would be equally true of a student you'd
  never seen the data for. Every claim must be traceable to a specific
  essay, topic, or number given below.
- Prefer a plain, concrete fact ("your last three essays each lost the
  AO3 marks on the conclusion paragraph") over a vague verdict ("your
  evaluation needs work").
`.trim();

const CONTRACT = `
Return ONLY one JSON object with this exact shape:
{
  "overall_summary": string (3-5 sentences, direct, addressed to the student as "you"),
  "grade_trend": "improving" | "steady" | "declining",
  "ao_analysis": [
    { "ao": "AO1 Knowledge", "average_percent": number 0-100, "comment": string },
    { "ao": "AO2 Analysis", "average_percent": number 0-100, "comment": string },
    { "ao": "AO3 Evaluation", "average_percent": number 0-100, "comment": string }
  ],
  "key_strengths": [ { "title": string, "detail": string } ] (2-4 items, only genuine recurring patterns),
  "key_weaknesses": [ { "title": string, "detail": string, "evidence": string } ] (3-5 items — evidence must reference specifics, e.g. a topic, a missed element, or a mark pattern actually seen below, never invented),
  "action_plan": [
    { "priority": number starting at 1, "action": string (one concrete instruction), "why": string, "tool": "grade" | "practice" | "response-structure" | "essay-generator" | "diagrams" | "mcq" | "question-bank" }
  ] (4-6 items, ordered by what will move the mark most, each pointing at the single most relevant tool — when the weakness is MCQ-side, "why" should name whether it's concentrated in micro or macro when the section data below shows a real gap between the two),
  "encouragement": string (1-2 sentences, honest and specific, not generic praise)
}

${CLICHE_BAN}
`.trim();

export const getReviewPanel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReviewPanelResult | ReviewPanelEligibility> => {
    const { supabase, userId } = context;

    const { data: essayRows, error: essayError } = await supabase
      .from("essays")
      .select("id, question, max_mark, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(ESSAY_WINDOW);
    if (essayError) throw new Error(essayError.message);

    const { count: essayCount, error: countError } = await supabase
      .from("essays")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (countError) throw new Error(countError.message);

    // MCQ practice is PDF-only (mcq_pdf_attempts) — the older mcq_attempts
    // table belonged to the now-removed AI-generated-paper flow and nothing
    // writes to it anymore, so reading it here would leave the review panel
    // permanently blind to real MCQ history. One row per completed attempt
    // at a real past paper; questions already carry per-question
    // correctness (no separate answer key to cross-reference here).
    const { data: mcqRows, error: mcqError } = await supabase
      .from("mcq_pdf_attempts")
      .select("id, title, level, score, total, questions, completed_at")
      .eq("user_id", userId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(MCQ_WINDOW);
    if (mcqError) throw new Error(mcqError.message);

    const { count: mcqCount, error: mcqCountError } = await supabase
      .from("mcq_pdf_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("completed_at", "is", null);
    if (mcqCountError) throw new Error(mcqCountError.message);

    const totalEssays = essayCount ?? 0;
    const totalMcqPapers = mcqCount ?? 0;

    if (totalEssays < MIN_ESSAYS_FOR_REVIEW || totalMcqPapers < MIN_MCQ_PAPERS_FOR_REVIEW) {
      return {
        eligible: false,
        essayCount: totalEssays,
        mcqPaperCount: totalMcqPapers,
        essaysNeeded: Math.max(0, MIN_ESSAYS_FOR_REVIEW - totalEssays),
        mcqPapersNeeded: Math.max(0, MIN_MCQ_PAPERS_FOR_REVIEW - totalMcqPapers),
      };
    }

    const essayIds = (essayRows ?? []).map((row) => row.id);
    const { data: versionRows, error: versionError } = await supabase
      .from("essay_versions")
      .select("essay_id, version, grading, total_mark, created_at")
      .in("essay_id", essayIds.length > 0 ? essayIds : ["00000000-0000-0000-0000-000000000000"])
      .order("version", { ascending: false });
    if (versionError) throw new Error(versionError.message);

    // Latest version per essay only — earlier drafts of the same essay
    // aren't a separate data point, they're the same attempt improving.
    const latestVersionByEssay = new Map<string, (typeof versionRows)[number]>();
    for (const version of versionRows ?? []) {
      if (!latestVersionByEssay.has(version.essay_id)) {
        latestVersionByEssay.set(version.essay_id, version);
      }
    }

    const essaySummaries: EssaySummary[] = (essayRows ?? [])
      .map((essay) => {
        const version = latestVersionByEssay.get(essay.id);
        const grading = version?.grading as Grading | null | undefined;
        if (!grading) return null;
        const summary: EssaySummary = {
          essayId: essay.id,
          question: essay.question,
          maxMark: essay.max_mark,
          totalMark: version?.total_mark ?? grading.total_mark ?? 0,
          band: grading.band ?? "",
          aoBreakdown: grading.ao_breakdown,
          strengths: grading.strengths ?? [],
          weaknesses: grading.weaknesses ?? [],
          missingElements: grading.missing_elements,
          createdAt: essay.updated_at,
        };
        return summary;
      })
      .filter((item): item is EssaySummary => item !== null);

    // Full per-question correctness per topic, recomputed here rather than
    // trusted from a stored aggregate (mcq_pdf_attempts only persists the
    // overall score, not the topic breakdown), across every recent paper.
    // Each stored question already carries its own `correct` boolean
    // (graded against the paper's mark scheme at submit time), so there's
    // no separate answer key to cross-reference here.
    type StoredPdfQuestion = {
      number: number;
      topic: string;
      correct_answer: "A" | "B" | "C" | "D" | null;
      user_answer: "A" | "B" | "C" | "D" | null;
      correct: boolean | null;
    };

    const mcqTopicStats = new Map<string, { correct: number; total: number }>();
    const gradedMcqQuestions: { topic: string; correct: boolean }[] = [];
    for (const attempt of mcqRows ?? []) {
      const questions = (attempt.questions ?? []) as StoredPdfQuestion[];
      for (const question of questions) {
        if (question.correct === null) continue;
        const entry = mcqTopicStats.get(question.topic) ?? { correct: 0, total: 0 };
        entry.total += 1;
        if (question.correct) entry.correct += 1;
        mcqTopicStats.set(question.topic, entry);
        gradedMcqQuestions.push({ topic: question.topic, correct: question.correct });
      }
    }
    const weakTopicsFromData = [...mcqTopicStats.entries()]
      .map(([topic, stats]) => ({
        topic,
        accuracyPercent: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      }))
      .sort((a, b) => a.accuracyPercent - b.accuracyPercent);

    // SAT-"Reading vs Writing" style two-section split, layered on top of
    // the fine-grained per-topic breakdown above — same underlying
    // question data, grouped into micro / macro instead of ~6 syllabus
    // topics at a time.
    const mcqDomainBreakdown: DomainStat[] = aggregateMcqDomains(gradedMcqQuestions);

    const essayBlock = essaySummaries
      .map(
        (essay, index) =>
          `Essay ${index + 1} (${essay.totalMark}/${essay.maxMark}, band ${essay.band}):\n` +
          `Question: ${essay.question}\n` +
          `AO1 ${essay.aoBreakdown.knowledge.awarded}/${essay.aoBreakdown.knowledge.out_of}, ` +
          `AO2 ${essay.aoBreakdown.analysis.awarded}/${essay.aoBreakdown.analysis.out_of}, ` +
          `AO3 ${essay.aoBreakdown.evaluation.awarded}/${essay.aoBreakdown.evaluation.out_of}\n` +
          `Strengths: ${essay.strengths.join("; ") || "none recorded"}\n` +
          `Weaknesses: ${essay.weaknesses.join("; ") || "none recorded"}\n` +
          `Missing — definitions: ${essay.missingElements.definitions.join(", ") || "-"}; ` +
          `analysis: ${essay.missingElements.analysis.join(", ") || "-"}; ` +
          `evaluation: ${essay.missingElements.evaluation.join(", ") || "-"}; ` +
          `diagrams: ${essay.missingElements.diagrams.join(", ") || "-"}`,
      )
      .join("\n\n");

    const mcqBlock = (mcqRows ?? [])
      .map(
        (paper, index) =>
          `MCQ paper ${index + 1}: ${paper.score ?? 0}/${paper.total ?? 0} (${paper.level ?? "level unset"})`,
      )
      .join("\n");

    const topicBlock = weakTopicsFromData
      .map((entry) => `${entry.topic}: ${entry.accuracyPercent}% correct`)
      .join("\n");

    const domainBlock = mcqDomainBreakdown
      .map(
        (entry) =>
          `${MCQ_DOMAIN_LABEL[entry.domain]}: ${entry.correct}/${entry.attempted} correct (${entry.accuracyPct}%)`,
      )
      .join("\n");

    const systemPrompt = [
      "You are the principal examiner reviewing one Cambridge International 9708",
      "Economics student's full recent record — multiple graded essays AND multiple",
      "completed MCQ papers together — to write a single aggregate diagnostic review.",
      "",
      "This is NOT feedback on one essay. Find the PATTERN across attempts: what",
      "keeps costing marks, what is now reliably strong, and which syllabus topics",
      "the MCQ data shows are genuinely weak (not a single unlucky question). The",
      "MCQ section data below splits accuracy into micro and macro, the same way",
      "SAT-style feedback splits reading and writing — call out a real gap between",
      "the two sections when one exists, since that's often more actionable for a",
      "student than a long list of individual topics.",
      "",
      "Be specific and honest. Never invent a strength or weakness that isn't",
      "supported by the data below. Every weakness needs real evidence from the",
      "record. The action plan must point each item at the single most useful tool",
      "for fixing exactly that weakness.",
      "",
      CONTRACT,
    ].join("\n");

    const userMessage = [
      `=== Essays (${essaySummaries.length} most recent, latest draft of each) ===`,
      essayBlock || "No graded essays with recorded feedback.",
      "",
      `=== MCQ papers (${(mcqRows ?? []).length} most recent) ===`,
      mcqBlock || "No completed MCQ papers.",
      "",
      "=== Per-topic MCQ accuracy across all recent papers ===",
      topicBlock || "No topic data.",
      "",
      "=== MCQ accuracy by section (micro vs macro), across all recent papers ===",
      domainBlock || "No section data.",
    ].join("\n");

    const result = await chat({
      model: MODEL_ANALYSIS,
      temperature: 0.2,
      json: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const raw = extractFirstJsonObject(result.text);

    const aoAnalysisRaw = Array.isArray(raw.ao_analysis) ? raw.ao_analysis : [];
    const aoAnalysis = (["AO1 Knowledge", "AO2 Analysis", "AO3 Evaluation"] as const).map(
      (label) => {
        const match = aoAnalysisRaw.find(
          (item): item is Record<string, unknown> =>
            !!item && typeof item === "object" && (item as Record<string, unknown>).ao === label,
        );
        return {
          ao: label,
          averagePercent: Math.max(
            0,
            Math.min(100, Number((match?.average_percent as number) ?? 0) || 0),
          ),
          comment: typeof match?.comment === "string" ? match.comment : "",
        };
      },
    );

    const keyStrengths = Array.isArray(raw.key_strengths)
      ? raw.key_strengths
          .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
          .map((item) => ({
            title: String(item.title ?? "").trim(),
            detail: String(item.detail ?? "").trim(),
          }))
          .filter((item) => item.title.length > 0)
      : [];

    const keyWeaknesses = Array.isArray(raw.key_weaknesses)
      ? raw.key_weaknesses
          .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
          .map((item) => ({
            title: String(item.title ?? "").trim(),
            detail: String(item.detail ?? "").trim(),
            evidence: String(item.evidence ?? "").trim(),
          }))
          .filter((item) => item.title.length > 0)
      : [];

    const VALID_TOOLS: ReviewTool[] = [
      "grade",
      "practice",
      "response-structure",
      "essay-generator",
      "diagrams",
      "mcq",
      "question-bank",
    ];
    const actionPlan = Array.isArray(raw.action_plan)
      ? raw.action_plan
          .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
          .map((item, index) => ({
            priority: Number(item.priority) || index + 1,
            action: String(item.action ?? "").trim(),
            why: String(item.why ?? "").trim(),
            tool: (VALID_TOOLS.includes(item.tool as ReviewTool)
              ? item.tool
              : "practice") as ReviewTool,
          }))
          .filter((item) => item.action.length > 0)
          .sort((a, b) => a.priority - b.priority)
      : [];

    const gradeTrend: ReviewPanelResult["gradeTrend"] =
      raw.grade_trend === "improving" || raw.grade_trend === "declining"
        ? raw.grade_trend
        : raw.grade_trend === "steady"
          ? "steady"
          : "not enough data";

    return {
      eligible: true,
      essayCount: totalEssays,
      mcqPaperCount: totalMcqPapers,
      generatedAt: new Date().toISOString(),
      overallSummary: String(raw.overall_summary ?? "").trim(),
      gradeTrend,
      aoAnalysis,
      keyStrengths,
      keyWeaknesses,
      weakMcqTopics: weakTopicsFromData.slice(0, 6),
      mcqDomainBreakdown,
      actionPlan,
      encouragement: String(raw.encouragement ?? "").trim(),
    };
  });
