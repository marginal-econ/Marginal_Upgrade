import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Archive,
  ArrowLeft,
  BarChart3,
  Check,
  ChevronDown,
  Clipboard,
  Copy,
  Mail,
  FileText,
  Gauge,
  Search,
  Sparkles,
  Plus,
  RefreshCw,
  School,
  Trash2,
  UserMinus,
  UserPlus,
  UsersRound,
  Wand2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  addClassroomTeacher,
  archiveClassroom,
  createClassroom,
  getClassroomRoster,
  getClassroomTeachers,
  getStudentClassroomOverview,
  getStudentClassroomInsights,
  joinClassroom,
  leaveClassroom,
  listClassrooms,
  removeClassroomMember,
  removeClassroomTeacher,
  rotateClassroomCode,
} from "@/lib/classroom.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/classes")({
  component: ClassesPage,
});

type Classroom = {
  id: string;
  teacher_id: string;
  name: string;
  level: string;
  join_code: string;
  archived: boolean;
  created_at: string;
};

type RosterStudent = {
  membership_id: string;
  student_id: string;
  full_name: string | null;
  email: string;
  school: string | null;
  joined_at: string;
};

type ClassroomTeacher = {
  id: string;
  teacherId: string;
  fullName: string;
  email: string;
  school: string | null;
  avatarUrl: string | null;
  owner: boolean;
};

type StudentInsights = {
  student: {
    id: string;
    email: string;
    full_name: string | null;
    school: string | null;
    last_seen: string | null;
  };
  summary: {
    essays_marked: number;
    average_essay_percent: number | null;
    mcq_attempts: number;
    mcq_correct: number;
    mcq_total: number;
    generated_essays: number;
    generated_questions: number;
    live_examiner_sessions: number;
    ai_calls: number;
  };
  essays: Array<{
    id: string;
    question: string;
    mark: number | null;
    max_mark: number;
    created_at: string;
    ao1: number | null;
    ao2: number | null;
    ao3: number | null;
  }>;
  mcq_attempts: Array<{
    id: string;
    kind: string;
    title: string;
    topic: string | null;
    score: number | null;
    total: number;
    wrong: number;
    completed_at: string | null;
  }>;
  topics: Array<{
    topic: string;
    attempted: number;
    correct_count: number;
    accuracy_pct: number | null;
  }>;
  live_sessions: Array<{
    id: string;
    question: string;
    topic: string;
    level: string;
    words: number;
    issues: number;
    updated_at: string;
  }>;
};

type StudentClassroomOverview = {
  teacher: {
    id: string;
    fullName: string;
    school: string | null;
    avatarUrl: string | null;
  };
  studentCount: number;
  classmates: Array<{
    id: string;
    fullName: string;
    school: string | null;
    avatarUrl: string | null;
    joinedAt: string;
  }>;
};

function ClassesPage() {
  const queryClient = useQueryClient();
  const fetchClasses = useServerFn(listClassrooms);
  const createClass = useServerFn(createClassroom);
  const joinClass = useServerFn(joinClassroom);
  const leaveClass = useServerFn(leaveClassroom);
  const archiveClass = useServerFn(archiveClassroom);
  const classes = useQuery({ queryKey: ["classrooms"], queryFn: () => fetchClasses() });
  const [code, setCode] = useState("");
  const [teacherAccessAcknowledged, setTeacherAccessAcknowledged] = useState(false);
  const [name, setName] = useState("");
  const [level, setLevel] = useState<"as" | "a2" | "mixed">("mixed");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("code");
    if (fromUrl)
      setCode(
        fromUrl
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 6),
      );
  }, []);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["classrooms"] });
  };

  const createMutation = useMutation({
    mutationFn: () => createClass({ data: { name, level } }),
    onSuccess: async (row) => {
      setName("");
      setSelectedId(row.id);
      toast.success("Class created — the join code is ready.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const joinMutation = useMutation({
    mutationFn: () => {
      if (!teacherAccessAcknowledged) throw new Error("Please acknowledge teacher access first.");
      return joinClass({ data: { code, acknowledgeTeacherAccess: true } });
    },
    onSuccess: async (row) => {
      toast.success(`Joined ${row.classroom_name}.`);
      setCode("");
      setTeacherAccessAcknowledged(false);
      window.history.replaceState(null, "", window.location.pathname);
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const leaveMutation = useMutation({
    mutationFn: (classroomId: string) => leaveClass({ data: { classroomId } }),
    onSuccess: async () => {
      toast.success("You left the class.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const archiveMutation = useMutation({
    mutationFn: (classroomId: string) => archiveClass({ data: { classroomId } }),
    onSuccess: async () => {
      setSelectedId(null);
      toast.success("Class archived.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (classes.isLoading)
    return (
      <div className="p-6">
        <Skeleton className="h-72 w-full" />
      </div>
    );
  if (classes.error)
    return <div className="p-6 text-sm text-destructive">{(classes.error as Error).message}</div>;

  const role = classes.data?.role ?? "student";
  const rows = classes.data?.classes ?? [];
  const teacherMode = role === "teacher" || role === "admin";
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;
  const studentClassLimitReached = !teacherMode && rows.length >= 3;

  return (
    <div className="min-h-full bg-background">
      <PageHeader
        title={teacherMode ? "Your classes" : "Classes"}
        description={
          teacherMode
            ? "Create a class, share its six-character code, and see everyone who joins."
            : "Join a teacher's class with the code they shared with you."
        }
      />
      <div className="grid gap-6 p-5 md:p-8 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-5">
          {teacherMode ? (
            <form
              className="panel space-y-4 rounded-xl border border-border p-5"
              onSubmit={(event) => {
                event.preventDefault();
                createMutation.mutate();
              }}
            >
              <div>
                <p className="flex items-center gap-2 font-semibold">
                  <Plus className="size-4" /> Create a class
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  A secure join code is generated automatically.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="class-name">Class name</Label>
                <Input
                  id="class-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Year 12 Economics"
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Level</Label>
                <Select value={level} onValueChange={(value) => setLevel(value as typeof level)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="as">AS Level</SelectItem>
                    <SelectItem value="a2">A Level</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" disabled={!name.trim() || createMutation.isPending}>
                <School className="size-4" />{" "}
                {createMutation.isPending ? "Creating…" : "Create class"}
              </Button>
            </form>
          ) : (
            <form
              className="panel space-y-4 rounded-xl border border-border p-5"
              onSubmit={(event) => {
                event.preventDefault();
                joinMutation.mutate();
              }}
            >
              <div>
                <p className="flex items-center gap-2 font-semibold">
                  <UsersRound className="size-4" /> Join a class
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {studentClassLimitReached
                    ? "You have joined the maximum of 3 classes."
                    : `Ask your teacher for the six-character code. ${rows.length}/3 classes joined.`}
                </p>
              </div>
              <Input
                value={code}
                onChange={(event) =>
                  setCode(
                    event.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 6),
                  )
                }
                placeholder="ABC234"
                className="text-center font-mono text-lg tracking-[0.3em]"
                autoComplete="off"
                disabled={studentClassLimitReached}
              />
              <label className="flex items-start gap-2.5 rounded-lg border bg-muted/25 p-3 text-xs leading-relaxed text-muted-foreground">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-primary"
                  checked={teacherAccessAcknowledged}
                  onChange={(event) => setTeacherAccessAcknowledged(event.target.checked)}
                  disabled={studentClassLimitReached}
                />
                <span>
                  I understand that this class’s teachers can view my Marginal learning activity,
                  including essay results, MCQ performance, and Live Examiner progress, while I am
                  enrolled. See the{" "}
                  <Link to="/privacy" className="font-medium underline underline-offset-2">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              <Button
                className="w-full"
                disabled={
                  studentClassLimitReached ||
                  code.length !== 6 ||
                  !teacherAccessAcknowledged ||
                  joinMutation.isPending
                }
              >
                {studentClassLimitReached
                  ? "3-class limit reached"
                  : joinMutation.isPending
                    ? "Joining…"
                    : "Join class"}
              </Button>
            </form>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {teacherMode ? "Classes" : "Joined classes"}
            </p>
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                {teacherMode
                  ? "Create your first class to get a join code."
                  : "You have not joined a class yet."}
              </div>
            ) : (
              rows.map((row) => (
                <button
                  type="button"
                  key={row.id}
                  onClick={() => setSelectedId(row.id)}
                  className={cn(
                    "w-full rounded-xl border p-4 text-left transition-colors",
                    selected?.id === row.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/60",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{row.name}</span>
                    <Badge variant="secondary">
                      {row.level === "as" ? "AS" : row.level === "a2" ? "A Level" : "Mixed"}
                    </Badge>
                  </span>
                  {teacherMode ? (
                    <span className="mt-2 block font-mono text-xs tracking-widest text-muted-foreground">
                      {row.join_code}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>

        <div>
          {!selected ? (
            <div className="panel flex min-h-72 items-center justify-center rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
              {teacherMode
                ? "Create a class to open its teacher workspace."
                : "Join a class to see it here."}
            </div>
          ) : teacherMode ? (
            <TeacherClassroom
              classroom={selected}
              onRefresh={refresh}
              onArchive={() => archiveMutation.mutate(selected.id)}
            />
          ) : (
            <StudentClassroom
              classroom={selected}
              onLeave={() => leaveMutation.mutate(selected.id)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TeacherClassroom({
  classroom,
  onRefresh,
  onArchive,
}: {
  classroom: Classroom;
  onRefresh: () => Promise<void>;
  onArchive: () => void;
}) {
  const queryClient = useQueryClient();
  const fetchRoster = useServerFn(getClassroomRoster);
  const fetchTeachers = useServerFn(getClassroomTeachers);
  const addTeacher = useServerFn(addClassroomTeacher);
  const removeTeacher = useServerFn(removeClassroomTeacher);
  const rotateCode = useServerFn(rotateClassroomCode);
  const removeMember = useServerFn(removeClassroomMember);
  const roster = useQuery({
    queryKey: ["classroom-roster", classroom.id],
    queryFn: () => fetchRoster({ data: { classroomId: classroom.id } }),
  });
  const teachers = useQuery({
    queryKey: ["classroom-teachers", classroom.id],
    queryFn: () =>
      fetchTeachers({ data: { classroomId: classroom.id } }) as Promise<{
        canManage: boolean;
        teachers: ClassroomTeacher[];
      }>,
  });
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<RosterStudent | null>(null);
  const joinUrl = useMemo(
    () => `${window.location.origin}/classes?code=${classroom.join_code}`,
    [classroom.join_code],
  );
  const filteredRoster = (roster.data ?? []).filter((student) =>
    `${student.full_name ?? ""} ${student.email} ${student.school ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
    toast.success("Invitation copied.");
  };
  const rotate = useMutation({
    mutationFn: () => rotateCode({ data: { classroomId: classroom.id } }),
    onSuccess: async () => {
      toast.success("New join code created. The old code no longer works.");
      await onRefresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (membershipId: string) =>
      removeMember({ data: { membershipId, classroomId: classroom.id } }),
    onSuccess: async () => {
      toast.success("Student removed.");
      await queryClient.invalidateQueries({ queryKey: ["classroom-roster", classroom.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const addTeacherMutation = useMutation({
    mutationFn: () => addTeacher({ data: { classroomId: classroom.id, email: teacherEmail } }),
    onSuccess: async () => {
      setTeacherEmail("");
      toast.success("Teacher added to the class.");
      await queryClient.invalidateQueries({ queryKey: ["classroom-teachers", classroom.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const removeTeacherMutation = useMutation({
    mutationFn: (teacherId: string) =>
      removeTeacher({ data: { classroomId: classroom.id, teacherId } }),
    onSuccess: async () => {
      toast.success("Teacher removed from the class.");
      await queryClient.invalidateQueries({ queryKey: ["classroom-teachers", classroom.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-5">
      <section className="panel rounded-xl border border-border p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{classroom.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Students can join with this code or invitation link.
            </p>
          </div>
          <Badge>
            {classroom.level === "as"
              ? "AS Level"
              : classroom.level === "a2"
                ? "A Level"
                : "Mixed level"}
          </Badge>
        </div>
        <div className="mt-5 rounded-xl border border-primary/25 bg-primary/5 p-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Class code
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="font-mono text-3xl font-bold tracking-[0.2em]">
              {classroom.join_code}
            </span>
            <Button variant="outline" size="sm" onClick={() => copy(joinUrl)}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Copy invite
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a
                href={`mailto:?subject=${encodeURIComponent(`Join ${classroom.name} on Marginal`)}&body=${encodeURIComponent(`Use class code ${classroom.join_code}, or open ${joinUrl}`)}`}
              >
                <Mail className="size-4" /> Email invite
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => rotate.mutate()}
              disabled={rotate.isPending}
            >
              <RefreshCw className="size-4" /> New code
            </Button>
          </div>
          <p className="mt-3 break-all text-xs text-muted-foreground">{joinUrl}</p>
        </div>
      </section>

      <section className="panel overflow-hidden rounded-xl border border-border">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="font-semibold">Teaching team</h3>
            <p className="text-xs text-muted-foreground">
              Teachers can view students and open their detailed progress reports.
            </p>
          </div>
          <UsersRound className="size-5 text-muted-foreground" />
        </div>
        {teachers.data?.canManage ? (
          <form
            className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              addTeacherMutation.mutate();
            }}
          >
            <Input
              type="email"
              value={teacherEmail}
              onChange={(event) => setTeacherEmail(event.target.value)}
              placeholder="Teacher's Marginal account email"
              aria-label="Teacher email"
            />
            <Button type="submit" disabled={!teacherEmail.trim() || addTeacherMutation.isPending}>
              <UserPlus className="size-4" />
              {addTeacherMutation.isPending ? "Adding…" : "Add teacher"}
            </Button>
          </form>
        ) : null}
        {teachers.isLoading ? (
          <div className="p-5">
            <Skeleton className="h-20 w-full" />
          </div>
        ) : teachers.error ? (
          <p className="p-5 text-sm text-destructive">{(teachers.error as Error).message}</p>
        ) : (
          <div className="divide-y divide-border">
            {(teachers.data?.teachers ?? []).map((teacher) => (
              <div key={teacher.teacherId} className="flex items-center gap-3 px-5 py-4">
                <PersonAvatar name={teacher.fullName} avatarUrl={teacher.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{teacher.fullName}</p>
                    {teacher.owner ? <Badge variant="secondary">Class owner</Badge> : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {teacher.email}
                    {teacher.school ? ` · ${teacher.school}` : ""}
                  </p>
                </div>
                {teachers.data?.canManage && !teacher.owner ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Remove teacher"
                    onClick={() => removeTeacherMutation.mutate(teacher.teacherId)}
                    disabled={removeTeacherMutation.isPending}
                  >
                    <UserMinus className="size-4" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedStudent ? (
        <StudentProgress
          classroomId={classroom.id}
          student={selectedStudent}
          onBack={() => setSelectedStudent(null)}
        />
      ) : (
        <section className="panel overflow-hidden rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="font-semibold">Students</h3>
              <p className="text-xs text-muted-foreground">{roster.data?.length ?? 0} enrolled</p>
            </div>
            <UsersRound className="size-5 text-muted-foreground" />
          </div>
          {(roster.data?.length ?? 0) > 4 ? (
            <div className="border-b border-border p-3">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search students"
                  className="pl-9"
                />
              </div>
            </div>
          ) : null}
          {roster.isLoading ? (
            <div className="p-5">
              <Skeleton className="h-24 w-full" />
            </div>
          ) : roster.error ? (
            <p className="p-5 text-sm text-destructive">{(roster.error as Error).message}</p>
          ) : roster.data?.length === 0 ? (
            <div className="p-8 text-center">
              <Clipboard className="mx-auto size-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium">No students yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Copy the invitation above and send it to your class.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredRoster.map((student) => (
                <button
                  type="button"
                  key={student.membership_id}
                  onClick={() => setSelectedStudent(student)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50"
                >
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {(student.full_name || student.email).slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {student.full_name || student.email}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {student.email}
                      {student.school ? ` · ${student.school}` : ""}
                    </p>
                  </div>
                  <span className="hidden text-xs font-medium text-primary sm:block">
                    View report
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Remove student"
                    onClick={(event) => {
                      event.stopPropagation();
                      remove.mutate(student.membership_id);
                    }}
                  >
                    <UserMinus className="size-4" />
                  </Button>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          onClick={onArchive}
        >
          <Archive className="size-4" /> Archive class
        </Button>
      </div>
    </div>
  );
}

function StudentProgress({
  classroomId,
  student,
  onBack,
}: {
  classroomId: string;
  student: RosterStudent;
  onBack: () => void;
}) {
  const fetchInsights = useServerFn(getStudentClassroomInsights);
  const insights = useQuery({
    queryKey: ["student-classroom-insights", classroomId, student.student_id],
    queryFn: () =>
      fetchInsights({
        data: { classroomId, studentId: student.student_id },
      }) as Promise<StudentInsights>,
  });

  if (insights.isLoading) return <Skeleton className="h-[34rem] w-full" />;
  if (insights.error)
    return (
      <div className="panel rounded-xl border border-border p-6 text-sm text-destructive">
        {(insights.error as Error).message}
      </div>
    );
  const data = insights.data;
  if (!data) return null;
  const mcqAccuracy =
    data.summary.mcq_total > 0
      ? Math.round((data.summary.mcq_correct / data.summary.mcq_total) * 100)
      : null;
  const formatDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
          new Date(value),
        )
      : "No activity yet";
  const metrics = [
    ["Essays marked", data.summary.essays_marked, FileText],
    [
      "Average essay mark",
      data.summary.average_essay_percent == null ? "—" : `${data.summary.average_essay_percent}%`,
      BarChart3,
    ],
    ["MCQ accuracy", mcqAccuracy == null ? "—" : `${mcqAccuracy}%`, Check],
    ["Model essays generated", data.summary.generated_essays, Sparkles],
    ["Live Examiner sessions", data.summary.live_examiner_sessions, Gauge],
    ["AI study actions", data.summary.ai_calls, Wand2],
  ] as const;

  return (
    <div className="space-y-5">
      <section className="panel rounded-xl border border-border p-5 md:p-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 mb-3">
          <ArrowLeft className="size-4" /> Back to students
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {(data.student.full_name || data.student.email).slice(0, 1).toUpperCase()}
            </span>
            <div>
              <h2 className="text-xl font-semibold">
                {data.student.full_name || data.student.email}
              </h2>
              <p className="text-sm text-muted-foreground">
                {data.student.email}
                {data.student.school ? ` · ${data.student.school}` : ""}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={`mailto:${data.student.email}`}>
              <Mail className="size-4" /> Email student
            </a>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Last active: {formatDate(data.student.last_seen)}
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map(([label, value, Icon]) => (
          <div key={label} className="panel rounded-xl border border-border p-4">
            <Icon className="size-4 text-primary" />
            <p className="mt-3 text-2xl font-semibold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <section className="panel rounded-xl border border-border p-5">
        <h3 className="font-semibold">Where support is needed</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          MCQ topics with the lowest accuracy appear first.
        </p>
        {data.topics.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No completed MCQs yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {data.topics.map((topic) => (
              <div key={topic.topic}>
                <div className="mb-1 flex justify-between gap-3 text-sm">
                  <span>{topic.topic}</span>
                  <span className="text-muted-foreground">
                    {topic.correct_count}/{topic.attempted} · {topic.accuracy_pct ?? 0}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${topic.accuracy_pct ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <ActivityList title="Essay history" empty="No essays marked yet.">
          {data.essays.map((essay) => (
            <div key={essay.id} className="border-b border-border py-3 last:border-0">
              <div className="flex justify-between gap-3">
                <p className="line-clamp-2 text-sm font-medium">{essay.question}</p>
                <Badge variant="secondary">
                  {essay.mark ?? "—"}/{essay.max_mark}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                AO1 {essay.ao1 ?? "—"} · AO2 {essay.ao2 ?? "—"} · AO3 {essay.ao3 ?? "—"} ·{" "}
                {formatDate(essay.created_at)}
              </p>
            </div>
          ))}
        </ActivityList>
        <ActivityList title="MCQ results" empty="No completed MCQs yet.">
          {data.mcq_attempts.map((attempt) => (
            <div
              key={`${attempt.kind}-${attempt.id}`}
              className="border-b border-border py-3 last:border-0"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{attempt.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {attempt.kind}
                    {attempt.topic ? ` · ${attempt.topic}` : ""}
                  </p>
                </div>
                <Badge variant={attempt.wrong > 0 ? "outline" : "secondary"}>
                  {attempt.score ?? 0}/{attempt.total}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {attempt.wrong} incorrect · {formatDate(attempt.completed_at)}
              </p>
            </div>
          ))}
        </ActivityList>
        <ActivityList title="Live Examiner" empty="No Live Examiner sessions yet.">
          {data.live_sessions.map((session) => (
            <div key={session.id} className="border-b border-border py-3 last:border-0">
              <p className="line-clamp-2 text-sm font-medium">{session.question}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {session.topic} · {session.words ?? 0} words · {session.issues ?? 0} issues
                identified · {formatDate(session.updated_at)}
              </p>
            </div>
          ))}
        </ActivityList>
        <section className="panel rounded-xl border border-border p-5">
          <h3 className="font-semibold">Study tools</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/60 p-4">
              <p className="text-2xl font-semibold">{data.summary.generated_essays}</p>
              <p className="text-xs text-muted-foreground">Model essays created</p>
            </div>
            <div className="rounded-lg bg-muted/60 p-4">
              <p className="text-2xl font-semibold">{data.summary.generated_questions}</p>
              <p className="text-xs text-muted-foreground">Practice questions generated</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ActivityList({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: ReactNode[];
}) {
  return (
    <section className="panel rounded-xl border border-border p-5">
      <h3 className="font-semibold">{title}</h3>
      {children.length ? (
        <div className="mt-2">{children}</div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

function StudentClassroom({ classroom, onLeave }: { classroom: Classroom; onLeave: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const fetchOverview = useServerFn(getStudentClassroomOverview);
  const overview = useQuery({
    queryKey: ["student-classroom-overview", classroom.id],
    queryFn: () =>
      fetchOverview({ data: { classroomId: classroom.id } }) as Promise<StudentClassroomOverview>,
    enabled: expanded,
  });
  useEffect(() => setExpanded(false), [classroom.id]);

  return (
    <div className="space-y-5">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="panel w-full rounded-xl border border-border p-6 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <School className="size-6" />
            </div>
            <h2 className="mt-4 text-xl font-semibold">{classroom.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {expanded ? "Click to hide class details." : "Click to view teacher and classmates."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">
              {classroom.level === "as"
                ? "AS Level"
                : classroom.level === "a2"
                  ? "A Level"
                  : "Mixed level"}
            </Badge>
            <ChevronDown
              className={cn(
                "size-5 text-muted-foreground transition-transform",
                expanded && "rotate-180",
              )}
            />
          </div>
        </div>
      </button>

      {expanded && overview.isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : expanded && overview.error ? (
        <section className="panel rounded-xl border border-border p-5 text-sm text-destructive">
          {(overview.error as Error).message}
        </section>
      ) : expanded && overview.data ? (
        <>
          <section className="panel rounded-xl border border-border p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Teacher
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <PersonAvatar
                    name={overview.data.teacher.fullName}
                    avatarUrl={overview.data.teacher.avatarUrl}
                  />
                  <div>
                    <h3 className="font-semibold">{overview.data.teacher.fullName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {overview.data.teacher.school || "Class teacher"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-muted/60 px-4 py-3 text-center">
                <p className="text-2xl font-semibold">{overview.data.studentCount}</p>
                <p className="text-xs text-muted-foreground">
                  {overview.data.studentCount === 1 ? "student" : "students"}
                </p>
              </div>
            </div>
          </section>

          <section className="panel overflow-hidden rounded-xl border border-border">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="font-semibold">Classmates</h3>
                <p className="text-xs text-muted-foreground">
                  {overview.data.classmates.length} other{" "}
                  {overview.data.classmates.length === 1 ? "student" : "students"}
                </p>
              </div>
              <UsersRound className="size-5 text-muted-foreground" />
            </div>
            {overview.data.classmates.length === 0 ? (
              <div className="p-8 text-center">
                <UsersRound className="mx-auto size-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium">You are the first student here</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  New classmates will appear after they join.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {overview.data.classmates.map((classmate) => (
                  <div key={classmate.id} className="flex items-center gap-3 px-5 py-4">
                    <PersonAvatar name={classmate.fullName} avatarUrl={classmate.avatarUrl} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{classmate.fullName}</p>
                      {classmate.school ? (
                        <p className="truncate text-xs text-muted-foreground">{classmate.school}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}

      {expanded ? (
        <div className="flex justify-end">
          <Button variant="outline" className="text-destructive" onClick={onLeave}>
            <Trash2 className="size-4" /> Leave class
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function PersonAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-base font-semibold text-primary">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
