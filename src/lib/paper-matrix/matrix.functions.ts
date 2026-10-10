import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";

export interface MatrixArchivePaper {
  id: string;
  title: string;
  level: "as" | "a2";
  examYear: number;
  examSeries: string;
  questionCount: number;
  qpUrl: string;
  msUrl: string | null;
}

export interface MatrixArchiveEssay {
  id: string;
  level: "as" | "a2";
  topic: string;
  maxMark: number;
  examSeries: string | null;
  questionText: string;
}

export interface MatrixArchiveData {
  mcqPapers: MatrixArchivePaper[];
  essayQuestions: MatrixArchiveEssay[];
  years: number[];
  totalMcq: number;
  totalEssays: number;
}

export const getPaperMatrixArchive = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    // 1. Fetch all MCQ papers
    const { data: mcqData, error: mcqErr } = await supabase
      .from("mcq_pdf_papers")
      .select("id, title, level, exam_year, exam_series, question_count, qp_url, ms_url")
      .order("exam_year", { ascending: false })
      .order("title", { ascending: true });

    if (mcqErr) throw new Error(mcqErr.message);

    // 2. Fetch all Essay questions
    const { data: essayData, error: essayErr } = await supabase
      .from("bank_essay_questions")
      .select("id, level, topic, max_mark, exam_series, question_text")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(600);

    if (essayErr) throw new Error(essayErr.message);

    const mcqPapers: MatrixArchivePaper[] = (mcqData ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      level: (p.level as "as" | "a2") || "as",
      examYear: p.exam_year ?? 2023,
      examSeries: p.exam_series ?? "May/June",
      questionCount: p.question_count ?? 30,
      qpUrl: p.qp_url,
      msUrl: p.ms_url,
    }));

    const essayQuestions: MatrixArchiveEssay[] = (essayData ?? []).map((e) => ({
      id: e.id,
      level: (e.level as "as" | "a2") || "as",
      topic: e.topic,
      maxMark: e.max_mark,
      examSeries: e.exam_series,
      questionText: e.question_text,
    }));

    const yearSet = new Set<number>();
    for (const p of mcqPapers) {
      if (p.examYear) yearSet.add(p.examYear);
    }
    // Also parse years from essay series string (e.g. "May/June 2023 Paper 22")
    for (const e of essayQuestions) {
      const match = e.examSeries?.match(/\b(20\d{2})\b/);
      if (match) yearSet.add(parseInt(match[1], 10));
    }

    const years = Array.from(yearSet).sort((a, b) => b - a);

    return {
      mcqPapers,
      essayQuestions,
      years,
      totalMcq: mcqPapers.length,
      totalEssays: essayQuestions.length,
    } satisfies MatrixArchiveData;
  });
