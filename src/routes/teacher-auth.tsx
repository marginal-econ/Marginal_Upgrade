import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, CheckCircle2, Clock, GraduationCap, Lock, School, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/backend/client";
import { registerTeacher, getTeacherProfileStatus } from "@/lib/teacher.functions";

export const Route = createFileRoute("/teacher-auth")({
  head: () => ({
    meta: [
      { title: "Teacher & Department Portal — Marginal | Cambridge 9708 Economics" },
      {
        name: "description",
        content:
          "Official Teacher Portal for Cambridge 9708 Economics educators. Ingest mark schemes, calibrate anchors, manage cohorts, and moderate student scripts.",
      },
    ],
  }),
  component: TeacherAuthPage,
});

export function TeacherAuthPage() {
  const navigate = useNavigate();
  const registerTeacherFn = useServerFn(registerTeacher);
  const checkTeacherStatusFn = useServerFn(getTeacherProfileStatus);

  // Sign in state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInBusy, setSignInBusy] = useState(false);

  // Sign up state
  const [fullName, setFullName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpBusy, setSignUpBusy] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [pendingAccountWarning, setPendingAccountWarning] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInBusy(true);
    setPendingAccountWarning(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInEmail.trim(),
        password: signInPassword,
      });

      if (error) {
        toast.error(error.message);
        setSignInBusy(false);
        return;
      }

      // Check teacher verification status
      const statusRes = await checkTeacherStatusFn();

      if (statusRes.isStaff || statusRes.isAdmin || statusRes.status === "approved") {
        toast.success("Welcome, Educator! Staff privileges verified.");
        navigate({ to: "/classes", replace: true });
      } else if (statusRes.status === "pending") {
        // Teacher registered but admin hasn't approved yet
        await supabase.auth.signOut();
        setPendingAccountWarning(
          "Your teacher registration for this school is currently pending administrative verification. For exam security, access is granted once your institutional email is verified by our team."
        );
      } else {
        // Normal student account trying to sign in through teacher portal
        await supabase.auth.signOut();
        toast.error("This account does not have teacher staff privileges. Please use the student sign-in portal.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Sign in failed.");
    } finally {
      setSignInBusy(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim()) {
      toast.error("Official School Name is compulsory for teacher verification.");
      return;
    }
    if (!schoolEmail.trim() || !schoolEmail.includes("@")) {
      toast.error("A valid school/institutional email address is compulsory.");
      return;
    }
    if (signUpPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setSignUpBusy(true);
    try {
      const res = await registerTeacherFn({
        data: {
          fullName,
          schoolName,
          schoolEmail,
          password: signUpPassword,
        },
      });

      if (res.success) {
        setSubmittedSuccess(true);
        toast.success("Teacher registration submitted for administrative verification!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Registration failed.");
    } finally {
      setSignUpBusy(false);
    }
  };

  return (
    <div className="hero-glow relative flex min-h-dvh items-start justify-center overflow-x-hidden overflow-y-auto px-3 py-6 sm:items-center sm:px-4 sm:py-12">
      <div className="paper-grid pointer-events-none absolute inset-0 opacity-25" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-purple-500/10 blur-3xl" aria-hidden="true" />

      <div className="relative w-full max-w-xl">
        {/* Navigation Bar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link to="/" className="group flex items-center gap-2.5">
            <img
              src="/marginal-m-icon-clean.png"
              alt="Marginal"
              className="size-9 object-contain transition-transform group-hover:-rotate-6"
            />
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">Marginal</span>
              <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                Teacher Portal
              </span>
            </div>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to site
          </Link>
        </div>

        {/* Auth Card */}
        <div className="panel border-2 border-border shadow-xl p-6 sm:p-8 rounded-2xl bg-card">
          {submittedSuccess ? (
            <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 border border-purple-500/30">
                <Clock className="size-7" />
              </div>
              <h2 className="text-xl font-bold">Teacher Application Under Review</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Thank you, <strong>{fullName}</strong>. Your teacher account for <strong>{schoolName}</strong> ({schoolEmail}) has been registered and submitted to the Marginal administration team.
              </p>
              <div className="rounded-xl border border-border bg-muted/50 p-4 text-xs text-left space-y-2 text-muted-foreground">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <ShieldCheck className="size-4 text-purple-500" />
                  Why is verification required?
                </div>
                <p>
                  To protect confidential Cambridge 9708 mark schemes, examination anchor calibrations, and student classwork, all teacher privileges require one-time manual verification of institutional affiliation.
                </p>
                <p className="text-purple-600 dark:text-purple-400 font-medium">
                  You will receive an email confirmation once your account is verified.
                </p>
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmittedSuccess(false);
                    setSignInEmail(schoolEmail);
                  }}
                >
                  Return to Sign In
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-semibold uppercase tracking-wider mb-1">
                  <GraduationCap className="size-4" />
                  Cambridge 9708 Educators
                </div>
                <h1 className="text-2xl font-bold">Teacher &amp; Department Workspace</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Ingest school coursebooks, calibrate marking anchors, manage student cohorts, and review batch mock papers.
                </p>
              </div>

              {pendingAccountWarning && (
                <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-3">
                  <Clock className="size-5 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold mb-0.5">Account Pending Verification</strong>
                    {pendingAccountWarning}
                  </div>
                </div>
              )}

              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signin">Teacher Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Register as Teacher</TabsTrigger>
                </TabsList>

                {/* Teacher Sign In Tab */}
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="t-signin-email">School / Institutional Email</Label>
                      <Input
                        id="t-signin-email"
                        type="email"
                        required
                        placeholder="teacher@school.edu"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="t-signin-password">Password</Label>
                        <Link
                          to="/auth"
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <Input
                        id="t-signin-password"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                      />
                    </div>

                    <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white" disabled={signInBusy}>
                      {signInBusy ? "Verifying Credentials…" : "Sign In to Teacher Portal →"}
                    </Button>

                    <div className="pt-2 text-center text-xs text-muted-foreground">
                      Student looking for revision?{" "}
                      <Link to="/auth" className="text-purple-600 dark:text-purple-400 font-semibold hover:underline">
                        Go to Student Portal
                      </Link>
                    </div>
                  </form>
                </TabsContent>

                {/* Teacher Sign Up Tab */}
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="t-signup-name">Full Name</Label>
                      <Input
                        id="t-signup-name"
                        required
                        placeholder="Dr. Eleanor Vance"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="t-signup-school">Official School / Institution Name</Label>
                        <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">Compulsory</span>
                      </div>
                      <Input
                        id="t-signup-school"
                        required
                        placeholder="e.g. Cambridge International School, Delhi"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="t-signup-email">School / Institutional Email</Label>
                        <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">Compulsory</span>
                      </div>
                      <Input
                        id="t-signup-email"
                        type="email"
                        required
                        placeholder="e.vance@school.edu"
                        value={schoolEmail}
                        onChange={(e) => setSchoolEmail(e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Use your official school or college email domain to accelerate administrator verification.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="t-signup-password">Choose Password</Label>
                      <Input
                        id="t-signup-password"
                        type="password"
                        required
                        placeholder="At least 6 characters"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                      />
                    </div>

                    <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <School className="size-3.5 text-purple-600" />
                        Staff Verification Safeguard
                      </div>
                      <p>
                        Teacher accounts receive authority to ingest custom syllabus mark schemes, calibrate exam anchors, and manage student grades. All accounts require administrator verification before activation.
                      </p>
                    </div>

                    <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white" disabled={signUpBusy}>
                      {signUpBusy ? "Submitting Application…" : "Submit Teacher Registration →"}
                    </Button>

                    <div className="pt-1 text-center text-xs text-muted-foreground">
                      Already verified? Switch to the <strong>Teacher Sign In</strong> tab above.
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card/60">
            <BookOpen className="size-4 text-purple-500 shrink-0" />
            <span>Mark Scheme &amp; RAG Ingestion</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card/60">
            <ShieldCheck className="size-4 text-purple-500 shrink-0" />
            <span>Anchor Calibration Standards</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card/60">
            <School className="size-4 text-purple-500 shrink-0" />
            <span>Cohort Classroom Management</span>
          </div>
        </div>
      </div>
    </div>
  );
}
