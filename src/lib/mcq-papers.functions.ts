import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { isMarginalAdmin } from "@/lib/auth-admin";

const LevelSchema = z.enum(["as", "a2"]);
const ExamSeriesSchema = z.enum(["Feb/March", "May/June", "Oct/Nov"]);

async function assertLibraryStaff(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const isMarginal = isMarginalAdmin({
    userId: context.userId,
    email: (context as any).email,
    claims: (context as any).claims,
  });
  if (isMarginal) return;

  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .in("role", ["teacher"]);
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Only an administrator or teacher can manage MCQ papers.");
}

/** Anyone signed in can browse the library — this is what /mcq-live's picker reads. */
export const listMcqPapers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("mcq_pdf_papers")
      .select(
        "id, title, level, exam_year, exam_series, question_count, qp_url, ms_url, answer_key, created_at",
      )
      .order("exam_year", { ascending: false })
      .order("title", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return {
      papers: (data ?? []).map((p) => ({
        id: p.id as string,
        title: p.title as string,
        level: p.level as "as" | "a2",
        // Nullable — papers uploaded before year/series existed predate
        // this and simply won't be grouped; every new upload requires both.
        examYear: (p.exam_year ?? null) as number | null,
        examSeries: (p.exam_series ?? null) as string | null,
        questionCount: p.question_count as number,
        qpUrl: p.qp_url as string,
        msUrl: p.ms_url as string | null,
        answerKey: (p.answer_key ?? {}) as Record<string, "A" | "B" | "C" | "D">,
        createdAt: p.created_at as string,
      })),
    };
  });

const PaperInput = z
  .object({
    title: z.string().trim().min(1).max(200),
    level: LevelSchema,
    examYear: z.number().int().min(1990).max(2100),
    examSeries: ExamSeriesSchema,
    questionCount: z.number().int().positive().max(80),
    qpPath: z.string().min(1),
    qpUrl: z.string().url(),
    msPath: z.string().optional(),
    msUrl: z.string().url().optional(),
    answerKey: z.record(z.string(), z.enum(["A", "B", "C", "D"])).default({}),
  })
  .superRefine((paper, context) => {
    for (let number = 1; number <= paper.questionCount; number += 1) {
      if (!paper.answerKey[String(number)]) {
        context.addIssue({
          code: "custom",
          path: ["answerKey", String(number)],
          message: `The mark scheme is missing an answer for question ${number}.`,
        });
        break;
      }
    }
  });

/**
 * Add one or many papers in a single call — the admin UI's "Upload N papers"
 * button always calls this once with the whole batch rather than looping
 * one request per file. Files themselves are already in storage by the
 * time this runs (client uploads to the `mcq-papers` bucket directly, same
 * pattern question-bank-admin.tsx uses for diagram crops); this just
 * records the metadata rows. RLS on mcq_pdf_papers is the actual
 * enforcement that only an administrator can do this — a student's own call
 * here is rejected at the database, not just hidden in the UI.
 */
export const addMcqPapers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ papers: z.array(PaperInput).min(1).max(50) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertLibraryStaff(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const rows = data.papers.map((p) => ({
      title: p.title,
      level: p.level,
      exam_year: p.examYear,
      exam_series: p.examSeries,
      question_count: p.questionCount,
      qp_path: p.qpPath,
      qp_url: p.qpUrl,
      ms_path: p.msPath ?? null,
      ms_url: p.msUrl ?? null,
      answer_key: p.answerKey,
      uploaded_by: context.userId,
    }));

    const { data: inserted, error } = await supabaseAdmin
      .from("mcq_pdf_papers")
      .insert(rows)
      .select("id");

    if (error) {
      // A student hitting this path gets exactly this — RLS rejected the
      // insert rather than the app silently pretending it worked.
      throw new Error(
        error.code === "42501" || /row-level security/i.test(error.message)
          ? "Only an administrator can add papers to the library."
          : error.message,
      );
    }
    return { added: inserted?.length ?? 0 };
  });

export const deleteMcqPaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertLibraryStaff(context);
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { error } = await supabaseAdmin.from("mcq_pdf_papers").delete().eq("id", data.id);
    if (error) {
      throw new Error(
        error.code === "42501" || /row-level security/i.test(error.message)
          ? "Only an administrator can remove a paper."
          : error.message,
      );
    }
    return { ok: true };
  });
