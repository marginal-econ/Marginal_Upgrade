import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/app/app-shell";
import { QuestionBankAdmin } from "@/components/app/question-bank-admin";

export const Route = createFileRoute("/_authenticated/content-admin")({
  head: () => ({
    meta: [
      { title: "Content admin — Marginal Economics" },
      {
        name: "description",
        content:
          "Extract real past-paper MCQ and essay questions, then review and approve them into the student-facing question bank.",
      },
    ],
  }),
  component: ContentAdminPage,
});

// Staff-only (teacher or admin), same as Knowledge base — enforced by the
// bank_* RLS policies, not by a client-side redirect (nav already hides
// this route from students; a direct hit is rejected server-side).
function ContentAdminPage() {
  return (
    <div>
      <PageHeader
        title="Content admin"
        description="Paper and question-bank ingestion — separate from the App admin console. Extract real past-paper questions, then review and approve them before they reach students."
      />
      <QuestionBankAdmin />
    </div>
  );
}
