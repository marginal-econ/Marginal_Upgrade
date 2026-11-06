import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/app-shell";
import { DataResponseStudio } from "@/components/app/data-response-admin";

export const Route = createFileRoute("/_authenticated/data-response")({
  head: () => ({
    meta: [
      {
        title: "Cambridge Data Response Studio (9708 Section A) — Marginal Economics",
      },
      {
        name: "description",
        content:
          "Practice authentic Cambridge International AS & A Level Economics (9708) Section A Data Response papers with real case studies, Table 1.1 data, interactive diagrams, and strict mark scheme grading.",
      },
      {
        property: "og:title",
        content: "Cambridge Data Response Studio — Marginal Economics",
      },
      {
        property: "og:description",
        content:
          "Master Cambridge 9708 Paper 2 & Paper 4 Section A data response with interactive tables, diagrams, and instant examiner mark-scheme grading.",
      },
    ],
  }),
  component: DataResponsePage,
});

function DataResponsePage() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Data Response Papers"
        subtitle="Master Paper 2 & Paper 4 Section A case studies, interpret Table 1.1 figures, apply Own Figure Rule (OFR) calculations, and get marked strictly against official Cambridge mark schemes."
      />
      <DataResponseStudio />
    </div>
  );
}
