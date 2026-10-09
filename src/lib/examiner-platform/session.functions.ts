import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { getSupabaseAdmin } from "@/server/supabase";
import { getPaperConfig } from "./cambridge-papers";
import { processScriptTranscription, segmentTranscriptionByQuestions } from "./ocr-pipeline.server";
import { markQuestionResponse } from "./marking-engine.server";
import { verifyScriptMarking } from "./verification-engine.server";
import type {
  School,
  SchoolMember,
  MarkingSession,
  CandidateScript,
  QuestionMarkRecord,
  ReliabilityBenchmark,
  ExaminerAuditLog,
} from "./types";

// Helper: Assert school membership and return user's role
async function assertSchoolAccess(admin: any, userId: string, schoolId?: string) {
  let query = admin.from("school_members").select("school_id, role, status, schools(*)").eq("user_id", userId).eq("status", "active");
  if (schoolId) query = query.eq("school_id", schoolId);

  const { data, error } = await query.limit(1).maybeSingle();
  if (error || !data) {
    // If user has no school workspace yet, auto-provision default Northstar Academic school for authorized teachers
    const { data: defaultSchool } = await admin
      .from("schools")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (defaultSchool) {
      await admin.from("school_members").upsert({
        school_id: defaultSchool.id,
        user_id: userId,
        role: "teacher",
        status: "active",
      });
      return { schoolId: defaultSchool.id, role: "teacher", school: defaultSchool };
    }

    // Create initial school
    const { data: createdSchool, error: schoolErr } = await admin
      .from("schools")
      .insert({
        name: "Northstar International College",
        slug: "northstar-college",
        domain: "northstar.edu",
        plan: "institution",
      })
      .select("*")
      .single();

    if (schoolErr || !createdSchool) throw new Error("Failed to initialize school workspace.");

    await admin.from("school_members").insert({
      school_id: createdSchool.id,
      user_id: userId,
      role: "school_admin",
      status: "active",
    });

    return { schoolId: createdSchool.id, role: "school_admin", school: createdSchool };
  }

  return { schoolId: data.school_id, role: data.role, school: data.schools };
}

// 1. Get current teacher's school workspace & permissions
export const getMySchoolWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = getSupabaseAdmin();
    const access = await assertSchoolAccess(admin, context.userId);

    const [{ data: members }, { data: sessionCount }] = await Promise.all([
      admin
        .from("school_members")
        .select("id, school_id, user_id, role, department, status, created_at")
        .eq("school_id", access.schoolId),
      admin
        .from("examiner_marking_sessions")
        .select("id", { count: "exact", head: true })
        .eq("school_id", access.schoolId),
    ]);

    return {
      school: access.school as School,
      currentUserRole: access.role,
      members: (members || []) as SchoolMember[],
      totalSessions: sessionCount || 0,
    };
  });

// 2. List marking sessions for the teacher / school
export const listMarkingSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { schoolId?: string } | undefined) => d || {})
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const access = await assertSchoolAccess(admin, context.userId, data.schoolId);

    const { data: sessions, error } = await admin
      .from("examiner_marking_sessions")
      .select("*")
      .eq("school_id", access.schoolId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return { sessions: (sessions || []) as MarkingSession[] };
  });

// 3. Create a new marking session
export const createMarkingSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: unknown) =>
      z
        .object({
          title: z.string().trim().min(3).max(150),
          className: z.string().trim().min(1).max(100),
          subjectCode: z.literal("9708"),
          qualificationLevel: z.enum(["as", "a2"]),
          examSeries: z.string().trim().min(4), // '2024_may_june'
          paperNumber: z.string().trim().min(2), // '22', '42'
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const access = await assertSchoolAccess(admin, context.userId);
    const paperSpec = getPaperConfig(data.subjectCode, data.paperNumber, data.examSeries);

    const { data: created, error } = await admin
      .from("examiner_marking_sessions")
      .insert({
        school_id: access.schoolId,
        teacher_id: context.userId,
        title: data.title,
        class_name: data.className,
        subject_code: data.subjectCode,
        subject_title: paperSpec.subjectTitle,
        qualification_level: data.qualificationLevel,
        exam_series: data.examSeries,
        paper_number: data.paperNumber,
        max_mark: paperSpec.totalMarks,
        status: "active",
        resource_verified: true,
      })
      .select("*")
      .single();

    if (error || !created) throw new Error(error?.message || "Failed to create marking session.");
    return { session: created as MarkingSession };
  });

// 4. Get marking session details with candidate scripts
export const getMarkingSessionDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const [{ data: session, error: sessErr }, { data: scripts, error: scriptErr }] = await Promise.all([
      admin.from("examiner_marking_sessions").select("*").eq("id", data.sessionId).single(),
      admin
        .from("examiner_candidate_scripts")
        .select("*")
        .eq("session_id", data.sessionId)
        .order("candidate_code", { ascending: true }),
    ]);

    if (sessErr || !session) throw new Error("Marking session not found.");
    await assertSchoolAccess(admin, context.userId, session.school_id);

    return {
      session: session as MarkingSession,
      scripts: (scripts || []) as CandidateScript[],
    };
  });

// 5. Batch upload candidate scripts
export const uploadCandidateScriptBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: unknown) =>
      z
        .object({
          sessionId: z.string().uuid(),
          scripts: z.array(
            z.object({
              candidateCode: z.string().trim().min(1),
              fileName: z.string().trim().min(1),
              fileUrl: z.string().optional(),
              pageCount: z.number().int().min(1).default(1),
              pages: z
                .array(
                  z.object({
                    pageNumber: z.number().int().min(1),
                    dataUrl: z.string().optional(),
                    textFallback: z.string().optional(),
                  }),
                )
                .default([]),
            }),
          ),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const { data: session } = await admin
      .from("examiner_marking_sessions")
      .select("school_id")
      .eq("id", data.sessionId)
      .single();
    if (!session) throw new Error("Session not found.");
    await assertSchoolAccess(admin, context.userId, session.school_id);

    const insertedScripts: CandidateScript[] = [];

    for (const item of data.scripts) {
      const { data: created, error } = await admin
        .from("examiner_candidate_scripts")
        .insert({
          session_id: data.sessionId,
          candidate_code: item.candidateCode,
          file_name: item.fileName,
          file_url: item.fileUrl || null,
          page_count: item.pageCount,
          status: "queued",
          page_transcriptions: item.pages.map((p) => ({
            page_number: p.pageNumber,
            raw_text: p.textFallback || "",
            detected_questions: [],
            diagram_tags: [],
            uncertain_words: [],
            has_cross_outs: false,
            confidence: 0.9,
          })),
        })
        .select("*")
        .single();

      if (!error && created) {
        insertedScripts.push(created as CandidateScript);
      }
    }

    // Update total count
    await admin
      .from("examiner_marking_sessions")
      .update({ total_scripts_count: insertedScripts.length })
      .eq("id", data.sessionId);

    return { scripts: insertedScripts };
  });

// 6. Process script marking (OCR -> Question Marking -> Verification Pass)
export const processScriptAiMarking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ scriptId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const { data: script } = await admin
      .from("examiner_candidate_scripts")
      .select("*, examiner_marking_sessions(*)")
      .eq("id", data.scriptId)
      .single();

    if (!script) throw new Error("Candidate script not found.");
    const session = script.examiner_marking_sessions;
    await assertSchoolAccess(admin, context.userId, session.school_id);

    const startTime = Date.now();

    // Step A: Update to OCR processing
    await admin
      .from("examiner_candidate_scripts")
      .update({ status: "ocr_processing" })
      .eq("id", script.id);

    const rawPages = (script.page_transcriptions || []) as any[];
    const ocrInput = rawPages.map((p: any) => ({
      pageNumber: p.page_number,
      textFallback: p.raw_text,
    }));

    const ocrResult = await processScriptTranscription(ocrInput);

    // Step B: Segment by questions & mark
    await admin
      .from("examiner_candidate_scripts")
      .update({
        status: "marking",
        page_transcriptions: ocrResult.pages,
        confidence_score: ocrResult.overallConfidence,
      })
      .eq("id", script.id);

    const paperSpec = getPaperConfig(session.subject_code, session.paper_number, session.exam_series);
    const expectedQNums = paperSpec.questions.map((q) => q.number);
    const segmented = segmentTranscriptionByQuestions(ocrResult.pages, expectedQNums);

    const questionResults: any[] = [];
    for (const qSpec of paperSpec.questions) {
      const studentText = segmented[qSpec.number] || "";
      const markResult = await markQuestionResponse({
        question: qSpec,
        studentAnswerText: studentText,
        candidateCode: script.candidate_code,
      });

      const { data: insertedQ } = await admin
        .from("examiner_question_marks")
        .insert({
          script_id: script.id,
          ...markResult,
        })
        .select("*")
        .single();

      if (insertedQ) questionResults.push(insertedQ);
    }

    // Step C: Independent Verification Pass
    await admin
      .from("examiner_candidate_scripts")
      .update({ status: "verification" })
      .eq("id", script.id);

    const verification = verifyScriptMarking(questionResults);
    const latencyMs = Date.now() - startTime;
    const estimatedCost = 0.042; // ~4.2 cents for OCR + full examiner prompt pass

    // Step D: Update script ready for teacher review
    const { data: updatedScript } = await admin
      .from("examiner_candidate_scripts")
      .update({
        status: "ready_for_review",
        total_ai_mark: verification.totalComputedMark,
        latency_ms: latencyMs,
        estimated_cost_usd: estimatedCost,
        updated_at: new Date().toISOString(),
      })
      .eq("id", script.id)
      .select("*")
      .single();

    // Log audit
    await admin.from("examiner_audit_logs").insert({
      school_id: session.school_id,
      script_id: script.id,
      user_id: context.userId,
      action: "ai_marking_completed",
      new_data: {
        total_ai_mark: verification.totalComputedMark,
        quality: verification.overallQuality,
        questions_marked: questionResults.length,
      },
      rationale: "Automated Cambridge 9708 marking and independent verification completed.",
    });

    return {
      script: updatedScript as CandidateScript,
      questions: questionResults as QuestionMarkRecord[],
      verification,
    };
  });

// 7. Get script for the Teacher Marking Desk (Two-pane interface)
export const getCandidateScriptForMarkingDesk = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ scriptId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const [{ data: script }, { data: questions }, { data: auditLogs }] = await Promise.all([
      admin
        .from("examiner_candidate_scripts")
        .select("*, examiner_marking_sessions(*)")
        .eq("id", data.scriptId)
        .single(),
      admin
        .from("examiner_question_marks")
        .select("*")
        .eq("script_id", data.scriptId)
        .order("question_number", { ascending: true }),
      admin
        .from("examiner_audit_logs")
        .select("*")
        .eq("script_id", data.scriptId)
        .order("created_at", { ascending: false }),
    ]);

    if (!script) throw new Error("Candidate script not found.");
    const session = script.examiner_marking_sessions;
    await assertSchoolAccess(admin, context.userId, session.school_id);

    return {
      script: script as CandidateScript,
      session: session as MarkingSession,
      questions: (questions || []) as QuestionMarkRecord[],
      auditLogs: (auditLogs || []) as any[],
    };
  });

// 8. Update teacher mark and notes for a specific question
export const updateQuestionTeacherMark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: unknown) =>
      z
        .object({
          questionId: z.string().uuid(),
          teacherMark: z.number().int().min(0),
          feedbackNote: z.string().optional(),
          isApproved: z.boolean().default(true),
          rationale: z.string().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const { data: q } = await admin
      .from("examiner_question_marks")
      .select("*, examiner_candidate_scripts(*, examiner_marking_sessions(school_id))")
      .eq("id", data.questionId)
      .single();

    if (!q) throw new Error("Question record not found.");
    const schoolId = q.examiner_candidate_scripts.examiner_marking_sessions.school_id;
    await assertSchoolAccess(admin, context.userId, schoolId);

    const safeMark = Math.min(q.max_mark, data.teacherMark);
    const isDisagreement = safeMark !== q.ai_awarded_mark;

    const { data: updated, error } = await admin
      .from("examiner_question_marks")
      .update({
        teacher_approved_mark: safeMark,
        teacher_feedback_note: data.feedbackNote || null,
        is_approved: data.isApproved,
        is_disagreement: isDisagreement,
        updated_at: new Date().toISOString(),
      })
      .eq("id", q.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    // Audit log
    await admin.from("examiner_audit_logs").insert({
      school_id: schoolId,
      script_id: q.script_id,
      user_id: context.userId,
      action: "teacher_edited_mark",
      previous_data: { mark: q.teacher_approved_mark ?? q.ai_awarded_mark },
      new_data: { mark: safeMark, question: q.question_number },
      rationale: data.rationale || "Teacher adjusted mark during script review.",
    });

    return { question: updated as QuestionMarkRecord };
  });

// 9. Approve complete script after teacher review
export const approveCandidateScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ scriptId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const [{ data: script }, { data: questions }] = await Promise.all([
      admin
        .from("examiner_candidate_scripts")
        .select("*, examiner_marking_sessions(school_id)")
        .eq("id", data.scriptId)
        .single(),
      admin.from("examiner_question_marks").select("*").eq("script_id", data.scriptId),
    ]);

    if (!script) throw new Error("Script not found.");
    const schoolId = script.examiner_marking_sessions.school_id;
    await assertSchoolAccess(admin, context.userId, schoolId);

    // Calculate total teacher-approved mark
    let totalTeacher = 0;
    for (const q of questions || []) {
      totalTeacher += q.teacher_approved_mark ?? q.ai_awarded_mark;
    }

    const { data: updated } = await admin
      .from("examiner_candidate_scripts")
      .update({
        status: "teacher_approved",
        total_teacher_approved_mark: totalTeacher,
        approved_at: new Date().toISOString(),
        approved_by: context.userId,
      })
      .eq("id", script.id)
      .select("*")
      .single();

    // Mark all questions as approved
    await admin
      .from("examiner_question_marks")
      .update({ is_approved: true })
      .eq("script_id", script.id);

    // Audit log
    await admin.from("examiner_audit_logs").insert({
      school_id: schoolId,
      script_id: script.id,
      user_id: context.userId,
      action: "script_approved",
      new_data: { total_mark: totalTeacher },
      rationale: "Teacher completed full script review and approved final marks.",
    });

    return { script: updated as CandidateScript };
  });

// 10. Submit moderator adjustment
export const submitScriptModeration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: unknown) =>
      z
        .object({
          scriptId: z.string().uuid(),
          moderatedMark: z.number().int().min(0),
          rationale: z.string().trim().min(5),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const { data: script } = await admin
      .from("examiner_candidate_scripts")
      .select("*, examiner_marking_sessions(school_id)")
      .eq("id", data.scriptId)
      .single();

    if (!script) throw new Error("Script not found.");
    const schoolId = script.examiner_marking_sessions.school_id;
    await assertSchoolAccess(admin, context.userId, schoolId);

    const { data: updated } = await admin
      .from("examiner_candidate_scripts")
      .update({
        status: "moderated",
        total_moderated_mark: data.moderatedMark,
      })
      .eq("id", script.id)
      .select("*")
      .single();

    await admin.from("examiner_audit_logs").insert({
      school_id: schoolId,
      script_id: script.id,
      user_id: context.userId,
      action: "moderation_adjusted",
      previous_data: { mark: script.total_teacher_approved_mark ?? script.total_ai_mark },
      new_data: { mark: data.moderatedMark },
      rationale: data.rationale,
    });

    return { script: updated as CandidateScript };
  });

// 11. Fetch Cambridge Reliability Benchmark metrics
export const getReliabilityBenchmarks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("examiner_benchmarks")
      .select("*")
      .order("tested_at", { ascending: false });

    if (error) throw new Error(error.message);
    return { benchmarks: (data || []) as ReliabilityBenchmark[] };
  });

// 12. Fetch moderation candidate scripts and school audit log
export const listModerationScripts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { sessionId?: string; discrepancyOnly?: boolean } | undefined) => d || {})
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const access = await assertSchoolAccess(admin, context.userId);

    let query = admin
      .from("examiner_candidate_scripts")
      .select(`
        *,
        examiner_marking_sessions!inner(id, school_id, title, paper_number, exam_series, max_mark)
      `)
      .eq("examiner_marking_sessions.school_id", access.schoolId)
      .in("status", ["ready_for_review", "teacher_approved", "moderated"])
      .order("created_at", { ascending: false });

    if (data.sessionId) {
      query = query.eq("session_id", data.sessionId);
    }

    const { data: scripts, error } = await query;
    if (error) throw new Error(error.message);

    let results = (scripts || []) as (CandidateScript & { examiner_marking_sessions: MarkingSession })[];

    if (data.discrepancyOnly) {
      results = results.filter((s) => {
        const ai = s.total_ai_mark ?? 0;
        const teacher = s.total_teacher_approved_mark;
        const hasDelta = teacher !== null && teacher !== undefined && Math.abs(teacher - ai) > 0;
        return hasDelta || (s.total_moderated_mark !== null);
      });
    }

    const { data: auditLogs } = await admin
      .from("examiner_audit_logs")
      .select("*")
      .eq("school_id", access.schoolId)
      .order("created_at", { ascending: false })
      .limit(40);

    return {
      scripts: results,
      auditLogs: (auditLogs || []) as ExaminerAuditLog[],
      userRole: access.role,
    };
  });
