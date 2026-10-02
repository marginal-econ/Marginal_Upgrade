import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";

export type { PaperHistoryEntry } from "./mcq/mcq-pdf.server";

const LevelSchema = z.enum(["as", "a2"]);

/** Tag each extracted question with a syllabus topic — classification only, no new questions. */
export const classifyMcqTopics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        level: LevelSchema,
        items: z.array(z.object({ number: z.number().int().positive(), text: z.string() })).max(80),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { classifyPdfMcqTopics } = await import("./mcq/mcq-pdf.server");
    const tags = await classifyPdfMcqTopics({ level: data.level, items: data.items });
    return { tags };
  });

// Answer buttons are a plain fixed side panel (one row per question,
// A/B/C/D) — no page-position placement of any kind, so there is
// deliberately no AI pathway here for locating, placing, or auditing
// button positions.

/**
 * On-demand explanation for one question in the post-attempt review
 * screen — typically opened for a question the student got wrong. Never
 * called before an attempt is marked, and never used to grade anything.
 */
export const explainMcqAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        level: LevelSchema,
        number: z.number().int().positive(),
        stemText: z.string().max(4000).default(""),
        correctAnswer: z.enum(["A", "B", "C", "D"]),
        userAnswer: z.enum(["A", "B", "C", "D"]).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { explainPdfMcqAnswer } = await import("./mcq/mcq-pdf.server");
    const explanation = await explainPdfMcqAnswer(data);
    return { explanation };
  });

const SubmittedQuestion = z.object({
  number: z.number().int().positive(),
  topic: z.string().default("Untagged"),
  skill: z.enum(["knowledge", "application", "analysis"]).default("knowledge"),
  correct_answer: z.enum(["A", "B", "C", "D"]).nullable(),
  user_answer: z.enum(["A", "B", "C", "D"]).nullable(),
  correct: z.boolean().nullable(),
});

/** Persist one graded past-paper attempt, so it feeds the same topic feedback as generated papers. */
export const submitPdfMcqAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().trim().max(200).default("Past paper practice"),
        filename: z.string().trim().max(200).optional(),
        level: LevelSchema,
        paperId: z.string().uuid(),
        questions: z.array(SubmittedQuestion).max(80),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: paper, error: paperError } = await supabase
      .from("mcq_pdf_papers")
      .select("id,title,level,question_count,answer_key")
      .eq("id", data.paperId)
      .single();
    if (paperError || !paper) throw new Error("That published paper could not be found.");
    if (paper.level !== data.level) throw new Error("The paper level does not match this attempt.");

    const answerKey = (paper.answer_key ?? {}) as Record<string, "A" | "B" | "C" | "D">;
    const questionCount = Number(paper.question_count);
    for (let number = 1; number <= questionCount; number += 1) {
      if (!answerKey[String(number)]) {
        throw new Error(
          `This paper cannot be marked because question ${number} is missing from its mark scheme.`,
        );
      }
    }

    const submittedByNumber = new Map(
      data.questions.map((question) => [question.number, question]),
    );
    const graded = Array.from({ length: questionCount }, (_, index) => {
      const number = index + 1;
      const submitted = submittedByNumber.get(number);
      const correctAnswer = answerKey[String(number)];
      const userAnswer = submitted?.user_answer ?? null;
      return {
        number,
        topic: submitted?.topic ?? "Untagged",
        skill: submitted?.skill ?? "knowledge",
        correct_answer: correctAnswer,
        user_answer: userAnswer,
        correct: userAnswer === correctAnswer,
      };
    });
    const score = graded.filter((question) => question.correct).length;

    const { data: row, error } = await supabase
      .from("mcq_pdf_attempts")
      .insert({
        user_id: userId,
        title: paper.title,
        filename: data.filename ?? null,
        level: data.level,
        paper_id: paper.id,
        questions: graded,
        score,
        total: questionCount,
        completed_at: new Date().toISOString(),
      })
      .select("id, score, total")
      .single();

    if (error || !row) throw new Error(error?.message ?? "Could not save that attempt.");
    return { attemptId: row.id, score: row.score, total: row.total };
  });

/** Weakest-first topic breakdown, combined across generated papers and past-paper practice. */
export const getMcqTopicPerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("mcq_topic_performance")
      .select("topic, attempted, correct_count, accuracy_pct")
      .eq("user_id", userId)
      .order("accuracy_pct", { ascending: true });

    if (error) throw new Error(error.message);
    return {
      topics: (data ?? []).map((t) => ({
        topic: t.topic as string,
        attempted: t.attempted as number,
        correct: t.correct_count as number,
        accuracyPct: t.accuracy_pct as number | null,
      })),
    };
  });

/**
 * Every past paper the student has practiced, one row per paper (not per
 * attempt) — retakes collapse together. Only the first completed attempt
 * at a given paper counts toward its aggregate score; later retakes are
 * shown too (so a student can see they've since improved) but never
 * replace it. Feeds the "Your history" sidebar on the library page.
 */
export const getMyPaperHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("mcq_pdf_attempts")
      .select("id, title, level, paper_id, score, total, completed_at, created_at")
      .eq("user_id", userId)
      .not("completed_at", "is", null)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const { groupPdfAttemptsByPaper } = await import("./mcq/mcq-pdf.server");
    return { papers: groupPdfAttemptsByPaper((data ?? []) as never) };
  });

/**
 * Full per-question breakdown for one past attempt, owned by the caller —
 * lets a student reopen a paper they already finished and revise it (the
 * review list + on-demand explanations) without redownloading or
 * re-rendering the original PDF.
 */
export const getPdfMcqAttempt = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ attemptId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("mcq_pdf_attempts")
      .select("id, title, level, paper_id, score, total, completed_at, questions")
      .eq("id", data.attemptId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("That attempt wasn't found.");

    return {
      id: row.id as string,
      title: row.title as string,
      level: row.level as "as" | "a2",
      paperId: row.paper_id as string,
      score: row.score as number | null,
      total: row.total as number,
      completedAt: row.completed_at as string | null,
      questions: (row.questions ?? []) as Array<{
        number: number;
        topic: string;
        correct_answer: "A" | "B" | "C" | "D" | null;
        user_answer: "A" | "B" | "C" | "D" | null;
        correct: boolean | null;
      }>,
    };
  });
