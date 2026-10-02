import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const classroomInput = z.object({
  name: z.string().trim().min(1, "Give the class a name.").max(100),
  level: z.enum(["as", "a2", "mixed"]),
});

const classroomIdInput = z.object({ classroomId: z.string().uuid() });

async function getClassroomAuthority(userId: string, classroomId: string) {
  const { getSupabaseAdmin } = await import("@/server/supabase");
  const admin = getSupabaseAdmin();
  const [{ data: classroom, error }, { data: roles }] = await Promise.all([
    admin.from("classrooms").select("teacher_id").eq("id", classroomId).single(),
    admin.from("user_roles").select("role").eq("user_id", userId),
  ]);
  if (error) throw new Error(error.message);
  const isAdmin = (roles ?? []).some((row) => row.role === "admin");
  const { data: collaborator } = await admin
    .from("classroom_teachers")
    .select("id")
    .eq("classroom_id", classroomId)
    .eq("teacher_id", userId)
    .maybeSingle();
  return {
    admin,
    classroom,
    isOwner: classroom.teacher_id === userId,
    isAdmin,
    isStaff: classroom.teacher_id === userId || isAdmin || Boolean(collaborator),
  };
}

async function assertTeacher(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .in("role", ["teacher", "admin"])
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Teacher access is required.");
}

export const listClassrooms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: roles }, { data: classes, error }] = await Promise.all([
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      context.supabase
        .from("classrooms")
        .select("id, teacher_id, name, level, join_code, archived, created_at")
        .eq("archived", false)
        .order("created_at", { ascending: false }),
    ]);
    if (error) throw new Error(error.message);
    const roleList = (roles ?? []).map((row) => row.role);
    return {
      role: roleList.includes("admin")
        ? ("admin" as const)
        : roleList.includes("teacher")
          ? ("teacher" as const)
          : ("student" as const),
      classes: classes ?? [],
    };
  });

export const createClassroom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => classroomInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertTeacher(context);
    // The caller is authorised above using their own JWT and the live
    // user_roles table. Perform the write with the server-only client after
    // that check so a stale/misapplied classroom INSERT policy cannot reject
    // a legitimate teacher. The browser never receives the service key and
    // cannot choose a different teacher_id.
    const { getSupabaseAdmin } = await import("@/server/supabase");
    const { data: row, error } = await getSupabaseAdmin()
      .from("classrooms")
      .insert({ teacher_id: context.userId, name: data.name, level: data.level })
      .select("id, teacher_id, name, level, join_code, archived, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const joinClassroom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        code: z.string().trim().min(4).max(20),
        acknowledgeTeacherAccess: z.literal(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: joined, error } = await context.supabase.rpc("join_classroom_by_code", {
      _code: data.code,
    });
    if (error) throw new Error(error.message);
    const row = joined?.[0];
    if (!row) throw new Error("That class could not be joined.");
    return row;
  });

export const getClassroomRoster = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ classroomId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("get_classroom_roster", {
      _classroom_id: data.classroomId,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getClassroomTeachers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => classroomIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff) throw new Error("Teacher access to this class is required.");

    const { data: collaborators, error } = await authority.admin
      .from("classroom_teachers")
      .select("id, teacher_id, created_at")
      .eq("classroom_id", data.classroomId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const entries = [
      { id: "owner", teacher_id: authority.classroom.teacher_id, created_at: null, owner: true },
      ...(collaborators ?? []).map((row) => ({ ...row, owner: false })),
    ];
    const profiles = await authority.admin
      .from("profiles")
      .select("id, full_name, school, avatar_url")
      .in(
        "id",
        entries.map((row) => row.teacher_id),
      );
    if (profiles.error) throw new Error(profiles.error.message);
    const profileById = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]));

    const teachers = await Promise.all(
      entries.map(async (entry) => {
        const profile = profileById.get(entry.teacher_id);
        const user = await authority.admin.auth.admin.getUserById(entry.teacher_id);
        return {
          id: entry.id,
          teacherId: entry.teacher_id,
          fullName: profile?.full_name?.trim() || user.data.user?.email || "Teacher",
          email: user.data.user?.email ?? "",
          school: profile?.school ?? null,
          avatarUrl: profile?.avatar_url ?? null,
          owner: entry.owner,
        };
      }),
    );
    return { canManage: authority.isOwner || authority.isAdmin, teachers };
  });

export const addClassroomTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ classroomId: z.string().uuid(), email: z.string().trim().email() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isOwner && !authority.isAdmin)
      throw new Error("Only the class owner can add another teacher.");

    const normalizedEmail = data.email.toLowerCase();
    let target:
      | Awaited<ReturnType<typeof authority.admin.auth.admin.listUsers>>["data"]["users"][number]
      | undefined;
    for (let page = 1; page <= 10 && !target; page += 1) {
      const result = await authority.admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (result.error) throw new Error(result.error.message);
      target = result.data.users.find((user) => user.email?.toLowerCase() === normalizedEmail);
      if (result.data.users.length < 1000) break;
    }
    if (!target) throw new Error("No Marginal account uses that email yet.");
    if (target.id === authority.classroom.teacher_id)
      throw new Error("That person already owns this class.");

    const { data: role } = await authority.admin
      .from("user_roles")
      .select("role")
      .eq("user_id", target.id)
      .in("role", ["teacher", "admin"])
      .limit(1)
      .maybeSingle();
    if (!role) throw new Error("Set this account's role to Teacher before adding it.");

    const { error } = await authority.admin.from("classroom_teachers").upsert(
      {
        classroom_id: data.classroomId,
        teacher_id: target.id,
        added_by: context.userId,
      },
      { onConflict: "classroom_id,teacher_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeClassroomTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ classroomId: z.string().uuid(), teacherId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isOwner && !authority.isAdmin)
      throw new Error("Only the class owner can remove another teacher.");
    if (data.teacherId === authority.classroom.teacher_id)
      throw new Error("The class owner cannot be removed.");
    const { error } = await authority.admin
      .from("classroom_teachers")
      .delete()
      .eq("classroom_id", data.classroomId)
      .eq("teacher_id", data.teacherId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getStudentClassroomOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ classroomId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { getSupabaseAdmin } = await import("@/server/supabase");
    const admin = getSupabaseAdmin();
    const { data: membership, error: membershipError } = await admin
      .from("classroom_members")
      .select("id")
      .eq("classroom_id", data.classroomId)
      .eq("student_id", context.userId)
      .maybeSingle();
    if (membershipError) throw new Error(membershipError.message);
    if (!membership) throw new Error("You are not enrolled in this class.");

    const [{ data: classroom, error: classroomError }, { data: members, error: membersError }] =
      await Promise.all([
        admin
          .from("classrooms")
          .select("teacher_id")
          .eq("id", data.classroomId)
          .eq("archived", false)
          .single(),
        admin
          .from("classroom_members")
          .select("student_id, joined_at")
          .eq("classroom_id", data.classroomId)
          .order("joined_at", { ascending: true }),
      ]);
    if (classroomError) throw new Error(classroomError.message);
    if (membersError) throw new Error(membersError.message);

    const profileIds = [classroom.teacher_id, ...(members ?? []).map((row) => row.student_id)];
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, full_name, school, avatar_url")
      .in("id", profileIds);
    if (profilesError) throw new Error(profilesError.message);

    const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    const teacher = profileById.get(classroom.teacher_id);
    return {
      teacher: {
        id: classroom.teacher_id,
        fullName: teacher?.full_name?.trim() || "Your teacher",
        school: teacher?.school ?? null,
        avatarUrl: teacher?.avatar_url ?? null,
      },
      studentCount: members?.length ?? 0,
      classmates: (members ?? [])
        .filter((row) => row.student_id !== context.userId)
        .map((row, index) => {
          const profile = profileById.get(row.student_id);
          return {
            id: row.student_id,
            fullName: profile?.full_name?.trim() || "Classmate " + (index + 1),
            school: profile?.school ?? null,
            avatarUrl: profile?.avatar_url ?? null,
            joinedAt: row.joined_at,
          };
        }),
    };
  });

export const getStudentClassroomInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ classroomId: z.string().uuid(), studentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: insights, error } = await context.supabase.rpc("get_teacher_student_insights", {
      _classroom_id: data.classroomId,
      _student_id: data.studentId,
    });
    if (error) throw new Error(error.message);
    return insights;
  });

export const rotateClassroomCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ classroomId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertTeacher(context);
    const { data: code, error } = await context.supabase.rpc("rotate_classroom_join_code", {
      _classroom_id: data.classroomId,
    });
    if (error) throw new Error(error.message);
    return { code };
  });

export const removeClassroomMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ membershipId: z.string().uuid(), classroomId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertTeacher(context);
    const { error } = await context.supabase
      .from("classroom_members")
      .delete()
      .eq("id", data.membershipId)
      .eq("classroom_id", data.classroomId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const leaveClassroom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ classroomId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("classroom_members")
      .delete()
      .eq("classroom_id", data.classroomId)
      .eq("student_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const archiveClassroom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ classroomId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertTeacher(context);
    const { error } = await context.supabase
      .from("classrooms")
      .update({ archived: true })
      .eq("id", data.classroomId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
