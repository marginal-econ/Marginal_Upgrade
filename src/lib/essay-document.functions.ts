import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";

const AnalyzeDocumentInput = z.object({
  textExcerpt: z.string().max(4000).default(""),
  needsQuestionExtraction: z.boolean().default(false),
  images: z
    .array(
      z.object({
        placeholder: z.string().min(1).max(64),
        dataUrl: z.string().startsWith("data:image/"),
        sourceKind: z.enum(["embedded_image", "pdf_page"]),
      }),
    )
    .max(8)
    .default([]),
});

/**
 * Analyzes embedded diagram images (from Google Docs .docx or .pdf) and extracts
 * any missing exam question / mark tariff in a single round-trip before auto-grading.
 */
export const analyzeUploadedEssayDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalyzeDocumentInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { getUserSubscriptionDetails } = await import("./subscription.server");
    const sub = await getUserSubscriptionDetails(
      supabase,
      userId,
      (context as any).email,
      (context as any).claims,
    );
    if (!sub.canGradeEssay) {
      const { FREE_ESSAY_LIMIT_MESSAGE, TEACHER_FREE_ESSAY_LIMIT_MESSAGE } = await import(
        "./usage-limits"
      );
      throw new Error(
        sub.isTeacher && !sub.isPaid ? TEACHER_FREE_ESSAY_LIMIT_MESSAGE : FREE_ESSAY_LIMIT_MESSAGE,
      );
    }

    const { analyzeUploadedImage, extractDocumentQuestionAndTariff } = await import(
      "./essay-document.server"
    );

    const [diagrams, meta] = await Promise.all([
      Promise.all(data.images.map((img, idx) => analyzeUploadedImage(img, idx + 1))),
      data.needsQuestionExtraction
        ? extractDocumentQuestionAndTariff(data.textExcerpt, userId)
        : Promise.resolve({
            extractedQuestion: null,
            extractedMaxMark: null,
            inferredQuestion: false,
          }),
    ]);

    return {
      diagrams,
      extractedQuestion: meta.extractedQuestion,
      extractedMaxMark: meta.extractedMaxMark,
      inferredQuestion: meta.inferredQuestion,
    };
  });
