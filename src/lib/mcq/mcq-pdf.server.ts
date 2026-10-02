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
import { AS_SECTIONS, A2_SECTIONS } from "./mcq.server";

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
    const key = row.paper_id ?? `solo:${row.id}`;
    const list = byKey.get(key);
    if (list) list.push(row);
    else byKey.set(key, [row]);
  }

  const entries: PaperHistoryEntry[] = [];
  for (const [key, attempts] of byKey) {
    const first = attempts[0];
    const latest = attempts[attempts.length - 1];
    entries.push({
      paperId: key.startsWith("solo:") ? null : key,
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
  skill: "knowledge" | "application" | "analysis";
};

/** Tags each question against the real syllabus sections — classification, not generation. */
export async function classifyPdfMcqTopics(options: {
  level: PdfMcqLevel;
  items: { number: number; text: string }[];
}): Promise<TopicTag[]> {
  if (options.items.length === 0) return [];
  const sections = options.level === "a2" ? A2_SECTIONS : AS_SECTIONS;

  const systemPrompt = [
    "You are tagging real Cambridge International AS & A Level Economics (9708) exam",
    "questions against the syllabus, for a student's topic-level feedback report.",
    "Do not answer, rewrite, or invent any question content — only classify what is given.",
    "",
    "Syllabus sections to choose from (use the closest match; do not invent new ones):",
    sections.map((s, i) => `${i + 1}. ${s}`).join("\n"),
  ].join("\n");

  const userMessage = [
    "Question text was extracted from a real PDF, so it may include the option list run",
    "together with the stem, stray line breaks, or minor OCR noise — classify from what's legible.",
    "",
    "Questions:",
    options.items.map((it) => `#${it.number}: ${it.text.slice(0, 600)}`).join("\n\n"),
    "",
    'Return ONLY one JSON object: { "tags": [ { "number": number, "topic": string, "skill": "knowledge" | "application" | "analysis" } ] }',
    "topic must be a short syllabus topic name drawn from the sections above (not the full sentence).",
  ].join("\n");

  const result = await chat({
    model: MODEL_EXAMINER,
    temperature: 0,
    json: true,
    reasoningEffort: "low",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const parsed = extractFirstJsonObject(result.text);
  const tags = Array.isArray(parsed.tags) ? (parsed.tags as unknown[]) : [];

  return tags
    .map((t) => {
      if (!t || typeof t !== "object") return null;
      const row = t as Record<string, unknown>;
      const number = Number(row.number);
      if (!Number.isFinite(number)) return null;
      const skill =
        row.skill === "application" || row.skill === "analysis" ? row.skill : "knowledge";
      return {
        number,
        topic: typeof row.topic === "string" && row.topic.trim() ? row.topic.trim() : "Untagged",
        skill,
      } satisfies TopicTag;
    })
    .filter((t): t is TopicTag => t !== null);
}

/**
 * Short written explanation of why one question's mark-scheme answer is
 * correct, generated on demand when a student opens a question in the
 * post-attempt review (typically one they got wrong). Text-only, given
 * just the stem text pulled from the PDF and the two letters involved —
 * never used to grade, and never shown until after the attempt is marked.
 */
export async function explainPdfMcqAnswer(options: {
  level: "as" | "a2";
  number: number;
  stemText: string;
  correctAnswer: "A" | "B" | "C" | "D";
  userAnswer: "A" | "B" | "C" | "D" | null;
}): Promise<string> {
  const { level, number, stemText, correctAnswer, userAnswer } = options;

  const systemPrompt = [
    "You are an experienced Cambridge International AS & A Level Economics (9708) teacher",
    `(${level === "a2" ? "A2" : "AS"} level) explaining one multiple-choice question to a student`,
    "reviewing their finished attempt. The question text below was extracted from a real PDF and",
    "may run the stem and options together or include minor noise — read past that.",
    "Explain, in a full short paragraph (roughly 4-7 sentences), why the correct option is right —",
    "walk through the underlying economics, not just the letter — and, if the student picked a",
    "different option, explain specifically why that option is wrong or less complete. Finish your",
    "explanation properly; never cut a sentence short. Plain text only, no markdown, no restating",
    "these instructions.",
  ].join(" ");

  const userMessage = [
    `Question ${number}:`,
    stemText.slice(0, 1200) ||
      "(question text unavailable — explain generally from the answer key)",
    "",
    `Correct answer: ${correctAnswer}`,
    userAnswer ? `Student's answer: ${userAnswer}` : "Student left this one blank.",
  ].join("\n");

  const result = await chat({
    model: MODEL_EXAMINER,
    temperature: 0.3,
    // "none", not "low" — this is a short written explanation, not a task
    // that benefits from a reasoning pass, and reasoning tokens on a GPT-5
    // family model count against the same maxCompletionTokens budget as
    // the visible answer. At "low" the model was spending a chunk of the
    // (too-small) 400-token budget on hidden reasoning and running out of
    // room before finishing the explanation, which is exactly the same
    // class of bug already fixed once in OCR (thinkingBudget: 0) — the
    // model wasn't wrong, it was starved. Raised the ceiling well past
    // what a 4-7 sentence paragraph needs, too, as a second safety margin.
    reasoningEffort: "none",
    maxCompletionTokens: 900,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  return result.text.trim();
}
