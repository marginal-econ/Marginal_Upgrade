import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";

const QuestionAnalysisInput = z.object({
  question: z.string().trim().min(5, "Question is too short.").max(2500),
  topic: z.string().trim().nullable().optional(),
});

export const getQuestionAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => QuestionAnalysisInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { analyzeQuestionForAo } = await import("./examiner/ao-fixer.server");
    return analyzeQuestionForAo(supabase, data.question, data.topic);
  });

const MarkAttemptInput = z.object({
  ao: z.enum(["ao1", "ao2", "ao3"]),
  question: z.string().trim().min(5, "Question is too short.").max(2500),
  studentText: z.string().trim().min(10, "Write at least a full sentence before marking.").max(5000),
  attemptNumber: z.number().int().min(1).default(1),
  previousMark: z.number().int().optional(),
  topic: z.string().trim().nullable().optional(),
});

export const submitAoAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MarkAttemptInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { markAoAttempt } = await import("./examiner/ao-fixer.server");

    try {
      const outcome = await markAoAttempt(supabase, {
        ao: data.ao,
        question: data.question,
        studentText: data.studentText,
        attemptNumber: data.attemptNumber,
        previousMark: data.previousMark,
        topic: data.topic,
      });

      await supabase.from("ai_usage_log").insert({
        user_id: userId,
        feature: `ao_fixer_${data.ao}`,
        model: outcome.model,
        latency_ms: outcome.latencyMs,
        ok: true,
      });

      return outcome;
    } catch (error) {
      await supabase.from("ai_usage_log").insert({
        user_id: userId,
        feature: `ao_fixer_${data.ao}`,
        model: "mistral-large-latest",
        ok: false,
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });

const HintInput = z.object({
  ao: z.enum(["ao1", "ao2", "ao3"]),
  question: z.string().trim().min(5),
  studentText: z.string().trim(),
});

export const requestAoHint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => HintInput.parse(input))
  .handler(async ({ data }) => {
    const { getAoHint } = await import("./examiner/ao-fixer.server");
    return getAoHint(data.ao, data.question, data.studentText);
  });

const ReportMarkInput = z.object({
  question: z.string().trim(),
  ao: z.string().trim(),
  studentText: z.string().trim(),
  awardedMark: z.number(),
  expectedMark: z.number(),
  notes: z.string().trim().optional(),
});

export const reportIncorrectAoMark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ReportMarkInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    try {
      await supabase.from("feedback").insert({
        user_id: userId,
        kind: "ao_mark_dispute",
        content: JSON.stringify(data),
      });
    } catch {
      // Fallback
    }
    return { ok: true };
  });
