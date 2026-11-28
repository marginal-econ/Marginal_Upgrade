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
import { supabaseAdmin } from "@/integrations/backend/client.server";
import { chat, visionChat } from "../ai.server";
import { MODEL_EXAMINER } from "../examiner/config";
import { extractFirstJsonObject } from "../examiner/json";
import { classifyMcqQuestion } from "../mcq-domain";
import { MCQ_MISTAKE_META_MAP, type McqMistakeType } from "../mcq-mistakes";
import { cleanStars } from "../utils";
import { formatThreeLineMcqFeedback } from "./mcq-feedback-format";

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
  /** Per-option economic elimination map so 1 shared cached v2 proof adapts to ANY student's chosen distractor */
  optionNotes?: Partial<Record<"A" | "B" | "C" | "D", string>>;
};

export type McqExplanationResult = {
  text: string;
  diagnostic?: McqDiagnostic;
  visionGrounded?: boolean;
  /** v2 = Answer-key-verified per-option explanation (replaces stale unversioned v1 cache) */
  version?: number;
};

/** Fast in-memory cache for active server instances (paperId:number -> McqExplanationResult) */
const inMemoryExplanationCache = new Map<string, McqExplanationResult>();

/**
 * Retrieves all stored explanations for a paper (from database & cache)
 * so students don't experience any waiting when practicing in Tutor Mode.
 */
export async function getStoredPaperExplanationsServer(
  paperId: string,
): Promise<Record<number, McqExplanationResult>> {
  const result: Record<number, McqExplanationResult> = {};

  // 1. Pull from in-memory cache for this paper
  const prefix = `${paperId}:`;
  for (const [key, val] of inMemoryExplanationCache.entries()) {
    if (key.startsWith(prefix)) {
      const qNum = parseInt(key.slice(prefix.length), 10);
      if (Number.isFinite(qNum)) {
        result[qNum] = val;
      }
    }
  }

  // 2. If it's a UUID paper from the library, pull from overlay.explanations in mcq_pdf_papers
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paperId);
  if (isUuid) {
    try {
      const { data, error } = await supabaseAdmin
        .from("mcq_pdf_papers")
        .select("overlay")
        .eq("id", paperId)
        .maybeSingle();

      if (!error && data?.overlay) {
        const dbExplanations = (data.overlay as Record<string, any>)?.explanations;
        if (dbExplanations && typeof dbExplanations === "object") {
          for (const [numStr, expl] of Object.entries(dbExplanations)) {
            const qNum = parseInt(numStr, 10);
            if (Number.isFinite(qNum) && expl && typeof expl === "object") {
              result[qNum] = expl as McqExplanationResult;
              inMemoryExplanationCache.set(`${paperId}:${qNum}`, expl as McqExplanationResult);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Failed to fetch stored explanations from mcq_pdf_papers:", err);
    }
  } else {
    // 3. If it's a topical paper, check if its source past papers have stored explanations!
    try {
      const { getTopicalPaperById } = await import("../topical-mcq-papers");
      const topical = getTopicalPaperById(paperId);
      if (topical) {
        const sourceTitles = Array.from(
          new Set(topical.questions.map((q) => q.sourcePaperTitle).filter(Boolean)),
        );
        if (sourceTitles.length > 0) {
          const { data: sourcePapers } = await supabaseAdmin
            .from("mcq_pdf_papers")
            .select("title, overlay")
            .in("title", sourceTitles);

          if (sourcePapers) {
            const byTitle = new Map(sourcePapers.map((p) => [p.title, p]));
            for (const q of topical.questions) {
              const sp = byTitle.get(q.sourcePaperTitle);
              const spExpls = (sp?.overlay as any)?.explanations;
              const spExpl = spExpls?.[String(q.originalQuestionNumber)];
              if (spExpl && !result[q.number]) {
                result[q.number] = spExpl as McqExplanationResult;
                inMemoryExplanationCache.set(`${paperId}:${q.number}`, spExpl as McqExplanationResult);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("Failed to map topical paper explanations:", err);
    }
  }

  return result;
}

/**
 * Persists an explanation to the in-memory cache and directly into Supabase (mcq_pdf_papers.overlay)
 * so it is stored beforehand and accessible instantly to every student.
 */
export async function savePaperExplanationServer(
  paperId: string,
  number: number,
  explanation: McqExplanationResult,
): Promise<void> {
  // Store in in-memory cache immediately
  inMemoryExplanationCache.set(`${paperId}:${number}`, explanation);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paperId);
  if (isUuid) {
    try {
      const { data } = await supabaseAdmin
        .from("mcq_pdf_papers")
        .select("id, overlay")
        .eq("id", paperId)
        .maybeSingle();

      if (data) {
        const currentOverlay = ((data.overlay as any) ?? {}) as Record<string, any>;
        const currentExplanations = (currentOverlay.explanations ?? {}) as Record<string, any>;
        currentExplanations[String(number)] = explanation;
        await supabaseAdmin
          .from("mcq_pdf_papers")
          .update({
            overlay: {
              ...currentOverlay,
              explanations: currentExplanations,
            },
          })
          .eq("id", paperId);
      }
    } catch (err) {
      console.warn("Failed to save explanation to mcq_pdf_papers:", err);
    }
  } else {
    // If topical paper, also map back and save to the source Cambridge past paper
    try {
      const { getTopicalPaperById } = await import("../topical-mcq-papers");
      const topical = getTopicalPaperById(paperId);
      const q = topical?.questions.find((item) => item.number === number);
      if (q?.sourcePaperTitle && q?.originalQuestionNumber) {
        const { data: sp } = await supabaseAdmin
          .from("mcq_pdf_papers")
          .select("id, overlay")
          .eq("title", q.sourcePaperTitle)
          .maybeSingle();

        if (sp) {
          const currentOverlay = ((sp.overlay as any) ?? {}) as Record<string, any>;
          const currentExplanations = (currentOverlay.explanations ?? {}) as Record<string, any>;
          currentExplanations[String(q.originalQuestionNumber)] = explanation;
          await supabaseAdmin
            .from("mcq_pdf_papers")
            .update({
              overlay: {
                ...currentOverlay,
                explanations: currentExplanations,
              },
            })
            .eq("id", sp.id);
        }
      }
    } catch (err) {
      console.warn("Failed to map topical explanation back to source paper:", err);
    }
  }
}

function adaptCachedExplanationForStudent(
  cached: McqExplanationResult,
  correctAnswer: "A" | "B" | "C" | "D",
  userAnswer: "A" | "B" | "C" | "D" | null,
): McqExplanationResult {
  const isCorrect = userAnswer !== null && userAnswer === correctAnswer;
  const optionNotes = cached.diagnostic?.optionNotes;
  const studentSpecificTrap =
    !isCorrect && userAnswer && optionNotes?.[userAnswer]
      ? optionNotes[userAnswer]!
      : cached.diagnostic?.distractorTrap ?? "";

  const adaptedDiagnostic: McqDiagnostic | undefined = cached.diagnostic
    ? {
        ...cached.diagnostic,
        distractorTrap: studentSpecificTrap || cached.diagnostic.distractorTrap,
      }
    : undefined;

  const formatted = formatThreeLineMcqFeedback({
    explanation: adaptedDiagnostic ? { diagnostic: adaptedDiagnostic, text: cached.text } : cached,
    correctAnswer,
    userAnswer,
    isCorrect,
  });

  return cleanStars({
    text: formatted.plainText,
    diagnostic: adaptedDiagnostic
      ? {
          ...adaptedDiagnostic,
          concept: formatted.concept ?? adaptedDiagnostic.concept,
          correctReasoning: formatted.line1.text,
          distractorTrap: formatted.line2.text,
          keyRule: formatted.line3.text,
        }
      : undefined,
    visionGrounded: cached.visionGrounded,
    version: cached.version,
  });
}

function detectsAnswerContradiction(
  reasoning: string,
  correctAnswer: "A" | "B" | "C" | "D",
): boolean {
  const others = (["A", "B", "C", "D"] as const).filter((opt) => opt !== correctAnswer);
  for (const wrong of others) {
    const pattern = new RegExp(
      `\\b(?:option|answer)\\s+${wrong}\\s+is\\s+(?:the\\s+)?(?:only\\s+)?(?:uniquely\\s+)?correct\\b`,
      "i",
    );
    if (pattern.test(reasoning)) return true;
  }
  return false;
}

/**
 * V2 Vision-Grounded, Answer-Key-Verified Principal Examiner MCQ Explanation.
 *
 * Fixes vs v1:
 *  1. Per-Option Grounded Map (`optionNotes: { A, B, C, D }`): cached once under `version: 2`,
 *     then dynamically adapted to WHICHEVER wrong option each student actually picked (fixes
 *     v1's cross-student cache contamination!).
 *  2. Higher-fidelity Vision (`maxCompletionTokens: 1200`) + Medium-Reasoning Text (`temp 0.0`)
 *     so diagram axes, curve shifts, shaded areas (W/X/Y/Z), and calculations are verified accurately.
 *  3. Hard Answer-Key Reconciliation Gate: if the model's `verifiedAnswer` disagrees with
 *     Cambridge's official mark scheme letter or contradicts it in prose, triggers a targeted
 *     reconciliation pass before caching.
 *  4. Automatically bypasses stale unversioned v1 cache entries so every paper upgrades cleanly.
 */
export async function explainPdfMcqAnswer(options: {
  paperId?: string | null;
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
    paperId,
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

  // Serve cached v2 explanation (ignoring stale unversioned v1 entries) and adapt to THIS student's option
  if (paperId && !mistakeType) {
    const memoryHit = inMemoryExplanationCache.get(`${paperId}:${number}`);
    if (memoryHit && memoryHit.version === 2) {
      return adaptCachedExplanationForStudent(memoryHit, correctAnswer, userAnswer);
    }
    const stored = await getStoredPaperExplanationsServer(paperId);
    if (stored[number] && stored[number].version === 2) {
      return adaptCachedExplanationForStudent(stored[number], correctAnswer, userAnswer);
    }
  }

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
    "You are a Cambridge International AS & A Level Economics (9708) Principal Examiner",
    `(${level === "a2" ? "A2 Level Paper 3" : "AS Level Paper 1"}) verifying and explaining an official past-paper multiple-choice question.`,
    "",
    "STRICT ACCURACY & VERIFICATION PROTOCOL:",
    hasImage
      ? "1. READ THE ATTACHED OFFICIAL PDF IMAGE FIRST. Carefully verify every word of the stem, ALL diagram axes, curve labels (e.g. D1->D2, S1->S2, AD/AS, MC/MR/AR/AC), shaded regions (W/X/Y/Z), table numbers, and exact wording of Options A, B, C, and D. Trust the image 100% over garbled PDF text."
      : "1. Base your proof strictly on the exact stem, numbers, and Options A–D provided. Never invent curves, figures, or opposite-direction claims.",
    `2. The OFFICIAL Cambridge 9708 mark scheme answer is Option ${correctAnswer}. Check your arithmetic, elasticity signs, and curve shifts carefully so your proof rigorously demonstrates why Option ${correctAnswer} is uniquely true and why each other option fails.`,
    "3. Explain ALL FOUR options (A, B, C, D) in `optionNotes` with concrete economic reasons referencing the question's actual data/curves/terms.",
    "4. Keep each explanation field crisp, concrete, and student-friendly (1 clear sentence per field, ~10–18 words, ZERO asterisks * or **).",
    "",
    "Return ONLY valid JSON with these exact keys:",
    "{",
    '  "concept": "<exact Cambridge 9708 unit & concept tested>",',
    `  "verifiedAnswer": "${correctAnswer}",`,
    `  "correctReasoning": "<1 crisp sentence proving why Option ${correctAnswer} is uniquely correct with exact mechanism/numbers>",`,
    '  "optionNotes": {',
    '    "A": "<1 crisp sentence: why A is correct or specifically why A is wrong>",',
    '    "B": "<1 crisp sentence: why B is correct or specifically why B is wrong>",',
    '    "C": "<1 crisp sentence: why C is correct or specifically why C is wrong>",',
    '    "D": "<1 crisp sentence: why D is correct or specifically why D is wrong>"',
    "  },",
    '  "topDistractor": "<A|B|C|D — the single most tempting wrong option>",',
    '  "keyRule": "<1 crisp Cambridge golden rule or formula takeaway (max 14 words)>",',
    '  "speedTip": "<1 crisp exam-room elimination shortcut (max 14 words)>"',
    "}",
  ].join("\n");

  const userMessage = [
    `Official Cambridge 9708 Question ${number} (${level === "a2" ? "A2 Paper 3" : "AS Paper 1"}):`,
    hasImage
      ? `(High-resolution official PDF crop of Question ${number} is attached — read axes, curves, tables, and Options A–D directly from the image.)`
      : "",
    stemText.trim()
      ? `Extracted PDF text reference:\n${stemText.trim().slice(0, 1800)}`
      : hasImage
        ? "(No PDF text extracted — read everything directly from the attached image.)"
        : `(Question ${number} in ${inferred.unit}: ${inferred.topic} / ${inferred.subtopic} — explain carefully based on Option ${correctAnswer})`,
    "",
    `Rough syllabus hint: ${inferred.unit} — ${inferred.topic} / ${inferred.subtopic}`,
    `OFFICIAL CAMBRIDGE MARK SCHEME ANSWER: Option ${correctAnswer}`,
    userAnswer
      ? `Student selected: Option ${userAnswer} (${isStudentCorrect ? "CORRECT" : "INCORRECT"})`
      : "Student left this question unattempted.",
    mistakeMeta && !isStudentCorrect
      ? `Student self-diagnosed mistake type: ${mistakeMeta.label} (${mistakeMeta.tagline}).`
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
        maxCompletionTokens: 1200,
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
      temperature: 0.0,
      json: true,
      reasoningEffort: "medium",
      maxCompletionTokens: 1100,
      userId: userId ?? null,
      feature: "mcq_explain_text",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });
    resultText = result.text;
  }

  let parsed = extractFirstJsonObject(resultText) as Record<string, unknown> | null;

  // Hard Answer-Key Consistency & Reconciliation Gate
  const rawVerified =
    typeof parsed?.verifiedAnswer === "string"
      ? parsed.verifiedAnswer.trim().toUpperCase().slice(0, 1)
      : "";
  const rawCorrectReasoning =
    typeof parsed?.correctReasoning === "string" ? parsed.correctReasoning.trim() : "";

  const needsReconciliation =
    !parsed ||
    (rawVerified && rawVerified !== correctAnswer) ||
    detectsAnswerContradiction(rawCorrectReasoning, correctAnswer);

  if (needsReconciliation) {
    try {
      const reconRes = await chat({
        model: MODEL_EXAMINER,
        temperature: 0.0,
        json: true,
        reasoningEffort: "medium",
        maxCompletionTokens: 1100,
        userId: userId ?? null,
        feature: "mcq_explain_reconcile",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              `${userMessage}\n\n` +
              `IMPORTANT VERIFICATION CORRECTION: The official published Cambridge 9708 mark scheme answer is strictly Option ${correctAnswer}. ` +
              `Double-check all calculations, definitions, and curve shifts and return clean JSON proving Option ${correctAnswer} accurately without contradicting the mark scheme.`,
          },
        ],
      });
      const reconParsed = extractFirstJsonObject(reconRes.text) as Record<string, unknown> | null;
      if (reconParsed && typeof reconParsed.correctReasoning === "string") {
        parsed = reconParsed;
      }
    } catch {
      /* proceed with best parsed output */
    }
  }

  if (parsed && typeof parsed === "object") {
    const p = parsed;
    const rawOptionNotes =
      p.optionNotes && typeof p.optionNotes === "object"
        ? (p.optionNotes as Record<string, unknown>)
        : {};
    const optionNotes: Partial<Record<"A" | "B" | "C" | "D", string>> = {};
    for (const opt of ["A", "B", "C", "D"] as const) {
      const v = rawOptionNotes[opt];
      if (typeof v === "string" && v.trim()) {
        optionNotes[opt] = cleanStars(v.trim());
      }
    }

    const topDistractorRaw =
      typeof p.topDistractor === "string" ? p.topDistractor.trim().toUpperCase().slice(0, 1) : "";
    const topDistractor =
      (["A", "B", "C", "D"] as const).find((o) => o === topDistractorRaw && o !== correctAnswer) ??
      (["A", "B", "C", "D"] as const).find((o) => o !== correctAnswer && Boolean(optionNotes[o]));

    const correctReasoning =
      typeof p.correctReasoning === "string" && p.correctReasoning.trim()
        ? p.correctReasoning.trim()
        : optionNotes[correctAnswer] || "";
    const defaultTrap =
      (topDistractor && optionNotes[topDistractor]) ||
      (typeof p.distractorTrap === "string" ? p.distractorTrap.trim() : "");
    const keyRule = typeof p.keyRule === "string" ? p.keyRule.trim() : "";
    const speedTip = typeof p.speedTip === "string" ? p.speedTip.trim() : "";

    const baseDiagnostic: McqDiagnostic = {
      concept:
        typeof p.concept === "string" && p.concept.trim()
          ? p.concept.trim()
          : `${inferred.unit}: ${inferred.subtopic}`,
      keyRule,
      correctReasoning,
      distractorTrap: defaultTrap,
      speedTip: speedTip ? cleanStars(speedTip) : keyRule,
      optionNotes: Object.keys(optionNotes).length > 0 ? optionNotes : undefined,
    };

    const baseCached: McqExplanationResult = cleanStars({
      text: `${correctReasoning}\n${defaultTrap}\n${keyRule}`,
      diagnostic: baseDiagnostic,
      visionGrounded,
      version: 2,
    });

    if (paperId && !mistakeType) {
      await savePaperExplanationServer(paperId, number, baseCached).catch(() => {});
    }
    return adaptCachedExplanationForStudent(baseCached, correctAnswer, userAnswer);
  }

  const fallbackFormatted = formatThreeLineMcqFeedback({
    explanation: resultText.trim(),
    correctAnswer,
    userAnswer,
    isCorrect: isStudentCorrect,
  });

  const fallbackResult: McqExplanationResult = cleanStars({
    text: fallbackFormatted.plainText,
    diagnostic: {
      concept: `${inferred.unit}: ${inferred.subtopic}`,
      correctReasoning: fallbackFormatted.line1.text,
      distractorTrap: fallbackFormatted.line2.text,
      keyRule: fallbackFormatted.line3.text,
      speedTip: fallbackFormatted.line3.text,
    },
    visionGrounded,
    version: 2,
  });
  if (paperId && !mistakeType) {
    await savePaperExplanationServer(paperId, number, fallbackResult).catch(() => {});
  }
  return fallbackResult;
}
