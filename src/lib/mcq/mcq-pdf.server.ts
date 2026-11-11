/**
 * Marginal MCQ Live — practice straight off an uploaded past paper.
 *
 * Deliberately does NOT generate any question content with AI: the paper is
 * real, printed, and shown exactly as-is. Answer buttons are a plain fixed
 * side panel (one row per question, A/B/C/D) — no page-position placement
 * of any kind, so there's nothing here to compute or audit.
 *
 * AI is used for two assistive (not generative) things only:
 *
 *   classifyPdfMcqTopics — tags each question against the real 9708
 *   syllabus sections so it can feed the same "where you're losing marks"
 *   feedback as the rest of the app. Text-only, cheap, one call per paper.
 *
 *   explainPdfMcqAnswer — after marking, a short written explanation of
 *   why the correct option is right for one question the student got
 *   wrong (or wants to review) — text-only, generated on demand per
 *   question, never used to grade.
 */
import { chat } from "../ai.server";
import { MODEL_EXAMINER } from "../examiner/config";
import { extractFirstJsonObject } from "../examiner/json";
import { classifyMcqQuestion } from "../mcq-domain";
import { cleanStars } from "../utils";

export type PdfMcqLevel = "as" | "a2";

/** One row as read straight off `mcq_pdf_attempts` — the minimum needed to group attempts by paper. */
export type PdfAttemptRow = {
  id: string;
  title: string;
  level: PdfMcqLevel;
  paper_id: string | null;
  score: number | null;
  total: number;
  completed_at: string | null;
  created_at: string;
};

/**
 * One row per *paper* a student has practiced, not one row per attempt —
 * retaking the same library paper collapses into a single history entry
 * instead of flooding the sidebar with duplicates.
 *
 * `aggregate*` is always the FIRST completed attempt at that paper: once a
 * paper has been scored, later retakes are for the student's own revision
 * only and never change the number that counts. `latest*` is simply the
 * most recent attempt, shown alongside so a student can see whether a
 * retake actually went better — it just doesn't overwrite the aggregate.
 *
 * Attempts with no `paper_id` (freeform/legacy rows, from before the
 * shared library existed) have no shared identity to group by, so each
 * one gets its own entry keyed by its own attempt id.
 */
export type PaperHistoryEntry = {
  paperId: string | null;
  title: string;
  level: PdfMcqLevel;
  attemptsCount: number;
  aggregateAttemptId: string;
  aggregateScore: number | null;
  aggregateTotal: number;
  aggregateAt: string;
  latestAttemptId: string;
  latestScore: number | null;
  latestTotal: number;
  latestAt: string;
};

/** Groups completed attempt rows into one history entry per paper, first-attempt-counts. */
export function groupPdfAttemptsByPaper(rows: PdfAttemptRow[]): PaperHistoryEntry[] {
  const completed = rows
    .filter((r) => r.completed_at)
    .slice()
    .sort((a, b) => (a.completed_at! < b.completed_at! ? -1 : 1));

  const byKey = new Map<string, PdfAttemptRow[]>();
  for (const row of completed) {
    const key =
      row.paper_id ??
      (row.title.startsWith("Topical Past Paper:") ? `topical:${row.title}` : `solo:${row.id}`);
    const list = byKey.get(key);
    if (list) list.push(row);
    else byKey.set(key, [row]);
  }

  const entries: PaperHistoryEntry[] = [];
  for (const [key, attempts] of byKey) {
    const first = attempts[0];
    const latest = attempts[attempts.length - 1];
    entries.push({
      paperId: key.startsWith("solo:") || key.startsWith("topical:") ? null : key,
      title: latest.title,
      level: latest.level,
      attemptsCount: attempts.length,
      aggregateAttemptId: first.id,
      aggregateScore: first.score,
      aggregateTotal: first.total,
      aggregateAt: first.completed_at!,
      latestAttemptId: latest.id,
      latestScore: latest.score,
      latestTotal: latest.total,
      latestAt: latest.completed_at!,
    });
  }

  return entries.sort((a, b) => (a.latestAt < b.latestAt ? 1 : -1));
}

export type TopicTag = {
  number: number;
  topic: string;
  subtopic: string;
  unit: string;
  domain: "micro" | "macro";
  skill: "knowledge" | "application" | "analysis";
};

/**
 * Tags each question against the canonical Cambridge 9708 syllabus topics.
 * Uses the fast deterministic syllabus classifier so grading & tagging
 * complete in < 1ms with zero network latency and zero "Untagged" failures.
 */
export async function classifyPdfMcqTopics(options: {
  level: PdfMcqLevel;
  items: { number: number; text: string }[];
}): Promise<TopicTag[]> {
  if (options.items.length === 0) return [];
  const levelUpper = options.level === "a2" ? "A2" : "AS";

  return options.items
    .filter((it) => Number.isFinite(it.number) && it.number >= 1)
    .map((it) => {
      const c = classifyMcqQuestion({
        level: levelUpper,
        number: it.number,
        text: it.text,
      });
      return {
        number: it.number,
        topic: c.topic,
        subtopic: c.subtopic,
        unit: c.unit,
        domain: c.domain,
        skill: c.skill,
      } satisfies TopicTag;
    });
}

export type McqDiagnostic = {
  concept: string;
  keyRule: string;
  correctReasoning: string;
  distractorTrap: string;
  speedTip: string;
};

export type McqExplanationResult = {
  text: string;
  diagnostic?: McqDiagnostic;
};

/**
 * Advanced examiner explanation of why one question's mark-scheme answer is
 * correct, generated on demand when a student opens a question in the
 * post-attempt review. Produces structured Cambridge 9708 diagnostic data
 * (concept, key rule, worked derivation, distractor trap analysis, speed tip).
 */
export async function explainPdfMcqAnswer(options: {
  level: "as" | "a2";
  number: number;
  stemText: string;
  correctAnswer: "A" | "B" | "C" | "D";
  userAnswer: "A" | "B" | "C" | "D" | null;
  topic?: string;
  subtopic?: string;
}): Promise<McqExplanationResult> {
  const { level, number, stemText, correctAnswer, userAnswer, topic, subtopic } = options;
  const inferred = classifyMcqQuestion({
    level: level === "a2" ? "A2" : "AS",
    number,
    text: stemText,
    existingTopic: topic,
    existingSubtopic: subtopic,
  });

  const systemPrompt = [
    "You are a Principal Examiner for Cambridge International AS & A Level Economics (9708)",
    `(${level === "a2" ? "A2 Level Paper 3" : "AS Level Paper 1"}) explaining a past multiple-choice question`,
    "to a student reviewing their finished paper attempt. The question stem was extracted from a real past paper.",
    "Deliver an advanced, authoritative diagnostic breakdown.",
    "NO ASTERISKS: Never use asterisks (* or **) anywhere in any JSON string. Do not use markdown bold, italics, or asterisk bullets. Return plain text only with zero asterisks.",
    "",
    "Return ONLY a single valid JSON object with these exact keys:",
    `- "concept": short syllabus unit & topic reference (e.g. "${inferred.unit}: ${inferred.subtopic}")`,
    '- "keyRule": the core economic principle, equation, or golden rule governing this question',
    '- "correctReasoning": clear step-by-step worked derivation of why the correct option is uniquely true',
    '- "distractorTrap": detailed diagnosis of why the student\'s choice was wrong or the common distractor trap Cambridge sets for this item',
    '- "speedTip": rapid elimination shortcut to solve or reject options in < 45 seconds on Paper 1/Paper 3',
    '- "summary": a cohesive 3-5 sentence explanation paragraph walking through the question',
  ].join("\n");

  const userMessage = [
    `Question ${number} (${inferred.unit} — ${inferred.topic} / ${inferred.subtopic}):`,
    stemText.trim().slice(0, 1400) ||
      `(Full diagram/stem text not captured — explain based on Cambridge 9708 Question ${number} in ${inferred.unit}: ${inferred.topic} / ${inferred.subtopic} and why Option ${correctAnswer} is the mark scheme answer)`,
    "",
    `Correct mark scheme answer: Option ${correctAnswer}`,
    userAnswer
      ? `Student selected: Option ${userAnswer} (${userAnswer === correctAnswer ? "CORRECT" : "INCORRECT"})`
      : "Student left this question unattempted.",
  ].join("\n");

  const result = await chat({
    model: MODEL_EXAMINER,
    temperature: 0.2,
    json: true,
    reasoningEffort: "none",
    maxCompletionTokens: 1000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const parsed = extractFirstJsonObject(result.text);
  if (parsed && typeof parsed === "object") {
    const p = parsed as Record<string, unknown>;
    const summary = typeof p.summary === "string" && p.summary.trim() ? p.summary.trim() : "";
    const correctReasoning =
      typeof p.correctReasoning === "string" ? p.correctReasoning.trim() : "";
    const text = summary || correctReasoning || result.text.trim();

    const diagnostic: McqDiagnostic = {
      concept:
        typeof p.concept === "string" && p.concept.trim()
          ? p.concept.trim()
          : `Cambridge 9708 Question ${number}`,
      keyRule: typeof p.keyRule === "string" ? p.keyRule.trim() : "",
      correctReasoning: correctReasoning || text,
      distractorTrap: typeof p.distractorTrap === "string" ? p.distractorTrap.trim() : "",
      speedTip: typeof p.speedTip === "string" ? p.speedTip.trim() : "",
    };

    return cleanStars({ text, diagnostic });
  }

  return cleanStars({
    text: result.text.trim(),
  });
}
