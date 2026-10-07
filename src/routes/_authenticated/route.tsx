import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";

import { AppShell } from "@/components/app/app-shell";
import { OnboardingTutorial } from "@/components/app/onboarding-tutorial";
import { PrivacyConsent } from "@/components/app/privacy-consent";
import { supabase } from "@/integrations/backend/client";
import { getMe } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    try {
      const { data, error } = await supabase.auth.getUser();
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
  const { data } = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });

  if (!user) {
    return null;
  }

  return (
    <AppShell role={data?.role ?? "student"} name={data?.fullName ?? null} userId={user.id}>
      <Outlet />
      <PrivacyConsent userId={user.id} onResolved={handlePrivacyResolved} />
      {/* Only ever true for a freshly-created account; flips to true for
          good the first time the dialog is dismissed either way. */}
      <OnboardingTutorial
        open={privacyResolved && data?.tutorialCompleted === false}
        onFinished={() => {}}
      />
    </AppShell>
  );
}
