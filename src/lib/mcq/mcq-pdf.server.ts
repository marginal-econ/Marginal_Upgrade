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
import { chat, visionChat } from "../ai.server";
import { MODEL_EXAMINER } from "../examiner/config";
import { extractFirstJsonObject } from "../examiner/json";
import { classifyMcqQuestion } from "../mcq-domain";
import { MCQ_MISTAKE_META_MAP, type McqMistakeType } from "../mcq-mistakes";
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
  visionGrounded?: boolean;
};

/**
 * Vision-grounded Principal Examiner explanation of why one question's
 * official Cambridge 9708 mark-scheme answer is uniquely correct.
 *
 * When a cropped PDF screenshot (`questionImageDataUrl`) is supplied, uses
 * high-resolution `visionChat()` FIRST so the examiner literally reads every
 * diagram axis, curve shift, shaded region, table cell, and option A/B/C/D
 * directly off the printed exam page. Automatically falls back to text-based
 * `chat()` with low reasoning effort if vision is unavailable.
 */
export async function explainPdfMcqAnswer(options: {
  level: "as" | "a2";
  number: number;
  stemText: string;
  correctAnswer: "A" | "B" | "C" | "D";
  userAnswer: "A" | "B" | "C" | "D" | null;
  topic?: string;
  subtopic?: string;
  mistakeType?: McqMistakeType | null;
  questionImageDataUrl?: string | null;
  userId?: string | null;
}): Promise<McqExplanationResult> {
  const {
    level,
    number,
    stemText,
    correctAnswer,
    userAnswer,
    topic,
    subtopic,
    mistakeType,
    questionImageDataUrl,
    userId,
  } = options;
  const inferred = classifyMcqQuestion({
    level: level === "a2" ? "A2" : "AS",
    number,
    text: stemText,
    existingTopic: topic,
    existingSubtopic: subtopic,
  });

  const mistakeMeta = mistakeType ? MCQ_MISTAKE_META_MAP[mistakeType] : null;
  const hasImage =
    typeof questionImageDataUrl === "string" &&
    questionImageDataUrl.startsWith("data:image/");
  const isStudentCorrect = userAnswer !== null && userAnswer === correctAnswer;

  const systemPrompt = [
    "You are a Principal Examiner for Cambridge International AS & A Level Economics (9708)",
    `(${level === "a2" ? "A2 Level Paper 3" : "AS Level Paper 1"}) delivering a strictly accurate, question-specific diagnostic breakdown for a real past paper multiple-choice question.`,
    "",
    "STRICT ACCURACY & GROUNDING RULES:",
    hasImage
      ? "1. READ THE ATTACHED OFFICIAL PDF IMAGE FIRST. Inspect EVERY word of the stem, ALL axis labels, curve labels (e.g. D1->D2, S1->S2, AD/AS, MC/MR), shaded areas (e.g. W, X, Y, Z), table numbers, and the EXACT wording of Options A, B, C, and D directly from the image. If the OCR text excerpt below is incomplete or garbled, TRUST THE PDF IMAGE 100%."
      : "1. Base your explanation strictly on the exact question stem and options provided. Never invent numbers, curve labels, or statements that do not appear in the question.",
    `2. The official Cambridge 9708 mark scheme answer is Option ${correctAnswer}. Never contradict the mark scheme; prove rigorously why Option ${correctAnswer} is uniquely true under Cambridge 9708 conventions.`,
    "3. QUOTE OR REFERENCE THE ACTUAL OPTION CONTENT: In correctReasoning, explicitly state what Option " +
      correctAnswer +
      " says (or depicts in the diagram/table) and derive step-by-step why it is true. For any calculation, show exact formula, substituted numbers, sign, and final value.",
    isStudentCorrect
      ? `4. THE STUDENT ANSWERED CORRECTLY (Option ${correctAnswer}). In distractorTrap, identify the #1 most tempting WRONG option from this exact question (naming its exact letter A/B/C/D and quoting/describing what it says) and explain precisely why that distractor fails so the student reinforces their mastery.`
      : userAnswer
        ? `4. THE STUDENT ANSWERED INCORRECTLY (picked Option ${userAnswer} instead of ${correctAnswer}). In distractorTrap, specifically quote/describe what Option ${userAnswer} says and explain the exact economic flaw in Option ${userAnswer}, then briefly note why the remaining wrong options fail.`
        : "4. In distractorTrap, identify the #1 most deceptive wrong option letter in this question and explain why candidates fall for it.",
    "5. In concept, name the EXACT Cambridge 9708 syllabus topic actually tested by THIS question (do not blindly repeat the fallback topic hint if the PDF image tests a different topic).",
    "6. In speedTip, give a concrete, question-specific elimination shortcut referencing an exact keyword, qualifier, axis, or calculation check from THIS question (no vague generic advice).",
    "7. NO ASTERISKS: Never use asterisks (* or **) anywhere in any JSON string. Do not use markdown bold, italics, or asterisk bullets. Return plain text only with zero asterisks.",
    "",
    "Return ONLY a single valid JSON object (no markdown fences, no commentary outside JSON) with these exact keys:",
    '- "concept": exact Cambridge 9708 syllabus unit & specific concept tested in this question',
    '- "keyRule": the core economic principle, formula, or Cambridge rule governing this exact question',
    '- "correctReasoning": exact step-by-step worked proof quoting Option ' +
      correctAnswer +
      " and showing every diagram/table/calculation step",
    '- "distractorTrap": specific diagnosis of ' +
      (isStudentCorrect
        ? "the top tempting wrong option letter the student successfully avoided"
        : userAnswer
          ? `why Option ${userAnswer} is wrong and how Cambridge set that trap`
          : "the main distractor trap Cambridge set in this question"),
    '- "speedTip": concrete elimination shortcut specific to this question (< 45 seconds)',
    '- "summary": a concise 3-4 sentence explanation walking straight through this exact question',
  ].join("\n");

  const userMessage = [
    `Official Cambridge 9708 Question ${number} (${level === "a2" ? "A2 Paper 3" : "AS Paper 1"}):`,
    hasImage
      ? "(High-resolution official PDF image of Question " +
        number +
        " is attached — read the exact stem, diagrams, tables, and Options A–D directly from the image.)"
      : "",
    stemText.trim()
      ? `Extracted PDF text reference (use only to assist; trust the attached PDF image if any diagram/table differs):\n${stemText.trim().slice(0, 1600)}`
      : hasImage
        ? "(No PDF text layer extracted — read the entire question directly from the attached PDF image.)"
        : `(Full diagram/stem text not captured — explain based on Cambridge 9708 Question ${number} in ${inferred.unit}: ${inferred.topic} / ${inferred.subtopic} and why Option ${correctAnswer} is the mark scheme answer)`,
    "",
    `Rough syllabus hint (override if image shows a different topic): ${inferred.unit} — ${inferred.topic} / ${inferred.subtopic}`,
    `Official Cambridge mark scheme answer: Option ${correctAnswer}`,
    userAnswer
      ? `Student selected: Option ${userAnswer} (${isStudentCorrect ? "CORRECT" : "INCORRECT"})`
      : "Student left this question unattempted.",
    mistakeMeta && !isStudentCorrect
      ? `Student self-diagnosed mistake type: ${mistakeMeta.label} (${mistakeMeta.tagline}). Tailor distractorTrap and speedTip to directly repair this exact error pattern.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  let resultText = "";
  let visionGrounded = false;

  if (hasImage) {
    try {
      const visionRes = await visionChat({
        model: MODEL_EXAMINER,
        systemPrompt,
        prompt: userMessage,
        imageDataUrls: [questionImageDataUrl],
        maxCompletionTokens: 1600,
        userId: userId ?? null,
        feature: "mcq_explain_vision",
      });
      if (visionRes.text && visionRes.text.trim().length > 20) {
        resultText = visionRes.text;
        visionGrounded = true;
      }
    } catch (visionErr) {
      console.warn(
        `Vision MCQ explanation failed for Q${number}, falling back to text chat:`,
        visionErr instanceof Error ? visionErr.message : visionErr,
      );
    }
  }

  if (!resultText) {
    const result = await chat({
      model: MODEL_EXAMINER,
      temperature: 0.1,
      json: true,
      reasoningEffort: "low",
      maxCompletionTokens: 1400,
      userId: userId ?? null,
      feature: "mcq_explain_text",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });
    resultText = result.text;
  }

  const parsed = extractFirstJsonObject(resultText);
  if (parsed && typeof parsed === "object") {
    const p = parsed as Record<string, unknown>;
    const summary = typeof p.summary === "string" && p.summary.trim() ? p.summary.trim() : "";
    const correctReasoning =
      typeof p.correctReasoning === "string" ? p.correctReasoning.trim() : "";
    const text = summary || correctReasoning || resultText.trim();

    const diagnostic: McqDiagnostic = {
      concept:
        typeof p.concept === "string" && p.concept.trim()
          ? p.concept.trim()
          : `${inferred.unit}: ${inferred.subtopic}`,
      keyRule: typeof p.keyRule === "string" ? p.keyRule.trim() : "",
      correctReasoning: correctReasoning || text,
      distractorTrap: typeof p.distractorTrap === "string" ? p.distractorTrap.trim() : "",
      speedTip: typeof p.speedTip === "string" ? p.speedTip.trim() : "",
    };

    return cleanStars({ text, diagnostic, visionGrounded });
  }

  return cleanStars({
    text: resultText.trim(),
    visionGrounded,
  });
}
