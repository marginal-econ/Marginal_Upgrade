import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, Trophy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listMyShowcaseCandidates,
  listShowcaseEssays,
  setShowcaseConsent,
} from "@/lib/showcase.functions";

export const Route = createFileRoute("/_authenticated/showcase")({
  head: () => ({
    meta: [
      { title: "Showcase — Marginal Economics" },
      {
        name: "description",
        content: "Top-scoring essays that their authors chose to publish anonymously.",
      },
    ],
  }),
  component: ShowcasePage,
});

function ShowcaseCard({
  essay,
}: {
  essay: Awaited<ReturnType<typeof listShowcaseEssays>>[number];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border border-border bg-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium leading-snug">{essay.question}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-400">
              <Trophy className="mr-1 size-3" />
              {essay.total_mark}/{essay.max_mark}
            </Badge>
            {essay.topic_name ? (
              <Badge variant="secondary" className="text-xs">
                {essay.topic_name}
              </Badge>
            ) : null}
            <Badge variant="outline" className="text-xs">
              {essay.author_initials ?? "Anonymous"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
        {essay.ao1_awarded !== null ? <span>AO1 {essay.ao1_awarded}</span> : null}
        {essay.ao2_awarded !== null ? <span>AO2 {essay.ao2_awarded}</span> : null}
        {essay.ao3_awarded !== null ? <span>AO3 {essay.ao3_awarded}</span> : null}
      </div>

      <CollapsibleTrigger asChild>
        <button className="mt-3 text-xs font-medium text-primary underline-offset-2 hover:underline">
          {open ? "Hide essay" : "Read essay"}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm leading-relaxed">
        {essay.essay_text}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ShowcasePage() {
  const queryClient = useQueryClient();
  const fetchShowcase = useServerFn(listShowcaseEssays);
  const fetchMine = useServerFn(listMyShowcaseCandidates);
  const updateConsent = useServerFn(setShowcaseConsent);
  const query = useQuery({
    queryKey: ["showcase-essays"],
    queryFn: () => fetchShowcase({ data: {} }),
  });
  const mine = useQuery({
    queryKey: ["my-showcase-candidates"],
    queryFn: () => fetchMine(),
  });

  async function toggleConsent(versionId: string, consent: boolean) {
    try {
      await updateConsent({ data: { versionId, consent } });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["showcase-essays"] }),
        queryClient.invalidateQueries({ queryKey: ["my-showcase-candidates"] }),
      ]);
      toast.success(consent ? "Essay published anonymously." : "Essay is private again.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update showcase privacy.");
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Showcase"
        description="Excellent essays their authors chose to share anonymously. Eligible work always remains private until its owner publishes it."
      />

      <div className="flex flex-1 flex-col gap-3 p-5 md:p-8">
        {(mine.data ?? []).length > 0 ? (
          <section className="mb-5 rounded-lg border border-border bg-muted/20 p-4">
            <h2 className="font-semibold">Your eligible essays</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your work stays private unless you explicitly publish it here. Only your initials are
              shown.
            </p>
            <div className="mt-3 space-y-2">
              {mine.data!.map((essay) => (
                <div
                  key={essay.version_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-card p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{essay.question}</p>
                    <p className="text-xs text-muted-foreground">
                      {essay.total_mark}/{essay.max_mark}
                    </p>
                  </div>
                  <Button
                    variant={essay.showcase_consented ? "outline" : "default"}
                    size="sm"
                    onClick={() => toggleConsent(essay.version_id, !essay.showcase_consented)}
                  >
                    {essay.showcase_consented ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                    {essay.showcase_consented ? "Make private" : "Publish anonymously"}
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        {query.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : (query.data ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
            <Trophy className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No essays have cleared the showcase threshold yet — keep marking!
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {query.data!.map((essay) => (
              <ShowcaseCard key={essay.version_id} essay={essay} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
