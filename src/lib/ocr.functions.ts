import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";

const TranscribeInput = z.object({
  /** Page images as data URLs, in reading order. */
  images: z
    .array(z.string().startsWith("data:image/", "Each page must be an image."))
    .min(1, "Add at least one page image.")
    .max(12, "Up to 12 pages at a time."),
  hint: z.string().trim().max(2000).optional(),
});

/** Read a handwritten answer into plain text for marking or AO coaching. */
export const transcribeHandwriting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TranscribeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Quota guard: ensure the student has remaining essay grading allowance before invoking vision OCR
    const { getUserSubscriptionDetails } = await import("./subscription.server");
    const sub = await getUserSubscriptionDetails(supabase, userId, (context as any).email, (context as any).claims);
    if (!sub.canGradeEssay) {
      const { FREE_ESSAY_LIMIT_MESSAGE, TEACHER_FREE_ESSAY_LIMIT_MESSAGE } = await import("./usage-limits");
      throw new Error(sub.isTeacher && !sub.isPaid ? TEACHER_FREE_ESSAY_LIMIT_MESSAGE : FREE_ESSAY_LIMIT_MESSAGE);
    }

    const { transcribeWithGemini } = await import("./ocr/gemini.server");
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    try {
      const outcome = await transcribeWithGemini(data.images, data.hint);

      await supabaseAdmin.from("ai_usage_log").insert({
        user_id: userId,
        feature: "transcribe_handwriting",
        model: outcome.model,
        latency_ms: outcome.latencyMs,
        ok: true,
      });

      return {
        text: outcome.text,
        pageTexts: outcome.pageTexts,
        pages: outcome.pages,
        failedPages: outcome.failedPages,
        pageErrors: outcome.pageErrors,
      };
    } catch (error) {
      await supabaseAdmin.from("ai_usage_log").insert({
        user_id: userId,
        feature: "transcribe_handwriting",
        model: "handwriting-ocr",
        ok: false,
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });
