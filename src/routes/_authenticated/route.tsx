import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";

import { AppShell } from "@/components/app/app-shell";
import { OnboardingTutorial } from "@/components/app/onboarding-tutorial";
import { PrivacyConsent } from "@/components/app/privacy-consent";
import { FeatureTutorialProvider } from "@/components/tutorials/tutorial-context";
import { FeatureTutorialDialog } from "@/components/tutorials/feature-tutorial-dialog";
import { supabase } from "@/integrations/backend/client";
import { getMe } from "@/lib/account.functions";
import { TIER_LIMITS, type PlanTier } from "@/lib/usage-limits";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    try {
      // Fast-path: read cached session from localStorage in 0ms without blocking route entry on a network call
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        return { user: sessionData.session.user };
      }

      const { data, error } = await Promise.race([
        supabase.auth.getUser(),
        new Promise<{ data: { user: null }; error: Error }>((resolve) =>
          setTimeout(
            () => resolve({ data: { user: null }, error: new Error("Auth timeout") }),
            4000,
          ),
        ),
      ]);
      if (error || !data.user) {
        throw redirect({
          to: "/auth",
          search: { redirect: location.pathname },
        });
      }
      return { user: data.user };
    } catch (err) {
      if (isRedirect(err)) throw err;
      throw redirect({
        to: "/auth",
        search: { redirect: location.pathname },
      });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const context = Route.useRouteContext();
  const user = context?.user;
  const [privacyResolved, setPrivacyResolved] = useState(false);
  const handlePrivacyResolved = useCallback(() => setPrivacyResolved(true), []);
  const fetchMe = useServerFn(getMe);
  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchMe(),
    staleTime: 0,
    refetchOnMount: "always",
  });

  if (!user) {
    return null;
  }

  // Derive instant attributes directly from authenticated user session metadata
  const userRole =
    (user.user_metadata as any)?.role === "teacher" ||
    (user.app_metadata as any)?.role === "teacher"
      ? "teacher"
      : "student";

  const rawTier =
    ((user.app_metadata as any)?.tier as PlanTier) ||
    ((user.user_metadata as any)?.tier as PlanTier) ||
    "free";
  const validTier = (TIER_LIMITS as any)[rawTier] ? rawTier : "free";
  const tierLimits = TIER_LIMITS[validTier as keyof typeof TIER_LIMITS];

  const userSub = data?.subscription ?? {
    tier: validTier,
    tierName: tierLimits.name,
    isPaid: validTier !== "free",
    isAdmin:
      user.id === "00296414-0221-4d5b-aa1c-04dc9366a218" ||
      user.email?.toLowerCase().trim() === "marginal.econ.ai@gmail.com",
    essaysGradedCount: 0,
    essaysLimit:
      (tierLimits as any).maxEssaysPerMonth ?? (tierLimits as any).monthlyEssayLimit ?? 999999,
    essaysRemaining:
      (tierLimits as any).maxEssaysPerMonth ?? (tierLimits as any).monthlyEssayLimit ?? 999999,
    canGradeEssay: true,
    liveExaminerCredits: tierLimits.liveExaminerCredits,
    canUseLiveExaminer: tierLimits.liveExaminerCredits > 0,
    mcqFreeDaysRemaining: 30,
    canUseMCQ: true,
  };

  const resolvedName =
    data?.fullName ||
    (user.user_metadata as any)?.full_name ||
    (user.user_metadata as any)?.name ||
    (user.email ? user.email.split("@")[0] : null);

  const resolvedRole = data?.role ?? userRole;
  const initialOnboardingActive = Boolean(privacyResolved && data?.tutorialCompleted === false);

  return (
    <FeatureTutorialProvider canAutoTrigger={!initialOnboardingActive && privacyResolved}>
      <AppShell
        role={resolvedRole}
        name={resolvedName}
        school={data?.school || (user.user_metadata as any)?.school || null}
        avatarUrl={data?.avatarUrl || (user.user_metadata as any)?.avatar_url || null}
        bio={data?.bio}
        birthday={data?.birthday}
        userId={user.id}
        subscription={userSub}
      >
        <Outlet />
        <PrivacyConsent userId={user.id} onResolved={handlePrivacyResolved} />
        <OnboardingTutorial
          open={initialOnboardingActive}
          initialFullName={resolvedName || ""}
          initialSchool={data?.school || (user.user_metadata as any)?.school || ""}
          role={resolvedRole}
          onFinished={() => {}}
        />
        <FeatureTutorialDialog />
      </AppShell>
    </FeatureTutorialProvider>
  );
}
