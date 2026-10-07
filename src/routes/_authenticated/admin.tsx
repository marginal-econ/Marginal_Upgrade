import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  CheckCircle2,
  Coins,
  Eraser,
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  Loader2,
  Plug,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  AccessPanel,
  ActivityOverview,
  SearchBox,
  displayName,
  matchesSearch,
  timeAgo,
  useUserActivity,
} from "@/components/app/admin-access";
import { PageHeader } from "@/components/app/app-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { embedNextBatch, listDocuments, reembedAllDocuments } from "@/lib/knowledge.functions";
import {
  activateProviderKey,
  adminOverview,
  deleteProviderKey,
  deleteUserAccount,
  listProviderKeys,
  listUsers,
  resetAllScores,
  resetStudentPracticeData,
  rotateProviderKey,
  saveProviderKey,
  setUserRole,
  testEmbeddingProviderKey,
  testProviderKey,
  testVisionProviderKey,
} from "@/lib/admin.functions";
import { getMe } from "@/lib/account.functions";
import {
  AI_PROVIDERS,
  EMBEDDING_PROVIDERS,
  VISION_PROVIDERS,
  providerMeta,
} from "@/lib/ai/providers";
import {
  autofillDiagramFromImage,
  deleteCustomDiagram,
  listCustomDiagrams,
  saveCustomDiagram,
} from "@/lib/diagrams.functions";
import { filesToPageImages } from "@/lib/handwriting-images";
import { SPEC_TEMPLATES, templateSpec } from "@/lib/diagrams/custom";
import { EconomicsDiagram } from "@/components/diagrams/economics-diagram";
import {
  adminAddShowcaseExemplar,
  adminDeleteShowcaseExemplar,
  adminListShowcaseEssays,
  adminToggleShowcaseVisibility,
  type ShowcaseEssayItem,
} from "@/lib/showcase.functions";

function embeddingModelsFor(meta: ReturnType<typeof providerMeta>): readonly string[] {
  return "embeddingModels" in meta ? meta.embeddingModels : [];
}

function visionModelsFor(meta: ReturnType<typeof providerMeta>): readonly string[] {
  return "visionModels" in meta ? meta.visionModels : [];
}

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin console — Marginal Economics" },
      {
        name: "description",
        content:
          "Platform admin console: manage roles, plug in your own AI provider keys, and monitor AI usage across the Economics platform.",
      },
      { property: "og:title", content: "Admin console — Marginal Economics" },
      {
        property: "og:description",
        content: "Roles, AI provider keys and usage monitoring for Marginal Economics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const fetchMe = useServerFn(getMe);

  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });

  if (me.isLoading) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (me.isError) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center space-y-4">
        <XCircle className="mx-auto size-8 text-destructive" />
        <h1 className="text-lg font-semibold">Unable to verify permissions</h1>
        <p className="text-sm text-muted-foreground">
          {me.error instanceof Error ? me.error.message : "Failed to load user profile."}
        </p>
        <Button onClick={() => me.refetch()} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  if (me.data?.role !== "admin") {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <ShieldCheck className="mx-auto size-8 text-muted-foreground" />
        <h1 className="mt-4 text-lg font-semibold">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This console is reserved exclusively for the platform administrator (vaquitavoid).
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Admin console"
        description="Everything in one place: platform totals, user roles, AI usage and your own AI provider keys."
      />
      <div className="px-5 py-6 md:px-8">
        <Tabs defaultValue="overview">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users &amp; Roles</TabsTrigger>
            <TabsTrigger value="access">Capacity &amp; AI Controls</TabsTrigger>
            <TabsTrigger value="showcase">Showcase</TabsTrigger>
            <TabsTrigger value="providers">AI Providers</TabsTrigger>
            <TabsTrigger value="embeddings">Embeddings</TabsTrigger>
            <TabsTrigger value="vision">Vision OCR</TabsTrigger>
            <TabsTrigger value="diagrams">Diagrams</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-5">
            <OverviewPanel />
          </TabsContent>
          <TabsContent value="users" className="mt-5">
            <UsersPanel />
          </TabsContent>
          <TabsContent value="access" className="mt-5">
            <AccessPanel />
          </TabsContent>
          <TabsContent value="showcase" className="mt-5">
            <ShowcaseAdminPanel />
          </TabsContent>
          <TabsContent value="providers" className="mt-5">
            <ProvidersPanel />
          </TabsContent>
          <TabsContent value="embeddings" className="mt-5">
            <EmbeddingsPanel />
          </TabsContent>
          <TabsContent value="vision" className="mt-5">
            <VisionPanel />
          </TabsContent>
          <TabsContent value="diagrams" className="mt-5">
            <DiagramsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function ProvidersPanel() {
  const queryClient = useQueryClient();
  const list = useServerFn(listProviderKeys);
  const save = useServerFn(saveProviderKey);
  const activate = useServerFn(activateProviderKey);
  const remove = useServerFn(deleteProviderKey);
  const test = useServerFn(testProviderKey);
  const rotate = useServerFn(rotateProviderKey);

  const keys = useQuery({
    queryKey: ["provider-keys", "chat"],
    queryFn: () => list({ data: { purpose: "chat" } }),
  });

  const [provider, setProvider] = useState<string>("anthropic");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [activateNow, setActivateNow] = useState(true);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotateValue, setRotateValue] = useState("");

  const meta = providerMeta(provider);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["provider-keys", "chat"] });

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          provider: provider as never,
          label: label || meta.label,
          apiKey,
          baseUrl,
          model: model || meta.models[0] || "",
          activate: activateNow,
        },
      }),
    onSuccess: async () => {
      toast.success("Key saved. AI features will use it immediately.");
      setApiKey("");
      setLabel("");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string | null) => activate({ data: { id } }),
    onSuccess: async () => {
      toast.success("Active provider updated.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: async () => {
      toast.success("Key removed.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => test({ data: { id } }),
    onSuccess: (result) =>
      result.ok
        ? toast.success(`Key works — ${result.model} replied "${result.reply}"`)
        : toast.error(result.reply),
    onError: (error: Error) => toast.error(error.message),
  });

  const rotateMutation = useMutation({
    mutationFn: (input: { id: string; apiKey: string }) => rotate({ data: input }),
    onSuccess: async () => {
      toast.success("Key rotated. The old secret no longer works here.");
      setRotatingId(null);
      setRotateValue("");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activeKey = (keys.data ?? []).find((row) => row.isActive);

  return (
    <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
      <section className="panel rounded-xl border border-border p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="size-4 text-primary" /> Add a provider key
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Bring your own Claude, Gemini, Grok, OpenAI, Groq, OpenRouter, Mistral or DeepSeek key.
          Keys stay server-side and are never sent to the browser.
        </p>

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select
              value={provider}
              onValueChange={(value) => {
                setProvider(value);
                setModel(providerMeta(value).models[0] ?? "");
                setBaseUrl("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.filter((item) => item.id !== "lovable").map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={meta.label}
            />
          </div>

          <div className="space-y-1.5">
            <Label>API key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={meta.keyHint}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Model id</Label>
            <Input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={meta.models[0] ?? "model-id"}
            />
            {meta.models.length ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {meta.models.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setModel(suggestion)}
                    className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>
              Base URL <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder={meta.baseUrl || "https://your-endpoint/v1"}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Make active</p>
              <p className="text-xs text-muted-foreground">
                Marking, coaching, MCQs and essays all route through it.
              </p>
            </div>
            <Switch checked={activateNow} onCheckedChange={setActivateNow} />
          </div>

          <Button
            className="w-full"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || apiKey.trim().length < 8}
          >
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save key
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="panel flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
          <div>
            <p className="text-sm font-semibold">
              Currently serving:{" "}
              {activeKey
                ? `${providerMeta(activeKey.provider).label} · ${activeKey.model}`
                : "Marginal AI (built in)"}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeKey
                ? "All AI features use your own key and billing."
                : "Uses the built-in credits. If they run out, add your own key on the left."}
            </p>
          </div>
          {activeKey ? (
            <Button variant="outline" size="sm" onClick={() => activateMutation.mutate(null)}>
              <Plug className="size-4" /> Switch back to Marginal AI
            </Button>
          ) : null}
        </div>

        {keys.isLoading ? <Skeleton className="h-28 w-full" /> : null}

        {(keys.data ?? []).map((row) => (
          <div key={row.id} className="panel rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  {row.label}
                  {row.isActive ? (
                    <Badge className="gap-1">
                      <CheckCircle2 className="size-3" /> Active
                    </Badge>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {providerMeta(row.provider).label} · {row.model} · key {row.maskedKey}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testMutation.mutate(row.id)}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Test
                </Button>
                {row.isActive ? null : (
                  <Button size="sm" onClick={() => activateMutation.mutate(row.id)}>
                    Use this
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRotateValue("");
                    setRotatingId(rotatingId === row.id ? null : row.id);
                  }}
                >
                  <RefreshCw className="size-4" /> Rotate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(row.id)}
                  aria-label={`Delete ${row.label}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            {rotatingId === row.id ? (
              <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
                <Label htmlFor={`rotate-${row.id}`}>New API key</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id={`rotate-${row.id}`}
                    type="password"
                    className="min-w-48 flex-1"
                    value={rotateValue}
                    onChange={(event) => setRotateValue(event.target.value)}
                    placeholder={providerMeta(row.provider).keyHint}
                  />
                  <Button
                    onClick={() => rotateMutation.mutate({ id: row.id, apiKey: rotateValue })}
                    disabled={rotateMutation.isPending || rotateValue.trim().length < 8}
                  >
                    {rotateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    Save new key
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Provider, model and active state stay the same — only the secret changes.
                </p>
              </div>
            ) : null}
          </div>
        ))}

        {keys.data && keys.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No provider keys yet. Add one on the left to stop depending on built-in credits.
          </p>
        ) : null}
      </section>
    </div>
  );
}

/**
 * Separate console section for embedding-purpose keys — deliberately its
 * own tab, own list, own active flag from the chat providers above, since
 * "which model marks essays" and "which model produces vectors for the
 * knowledge base" are independent choices that used to silently share one
 * setting. Multiple embedding keys can be saved at once; the Knowledge page
 * lets a specific ingestion job pick any of them, not just whichever is
 * flagged active here.
 */
function EmbeddingsPanel() {
  const queryClient = useQueryClient();
  const list = useServerFn(listProviderKeys);
  const save = useServerFn(saveProviderKey);
  const activate = useServerFn(activateProviderKey);
  const remove = useServerFn(deleteProviderKey);
  const test = useServerFn(testEmbeddingProviderKey);
  const rotate = useServerFn(rotateProviderKey);
  const reembedAll = useServerFn(reembedAllDocuments);
  const getDocuments = useServerFn(listDocuments);
  const embedBatch = useServerFn(embedNextBatch);

  const keys = useQuery({
    queryKey: ["provider-keys", "embedding"],
    queryFn: () => list({ data: { purpose: "embedding" } }),
  });

  // Drives every queued document's embedding to completion right here in
  // Admin, rather than requiring a separate trip to the Knowledge page.
  // Sequential (one document at a time, one batch at a time) on purpose:
  // embedNextBatch already batches internally, and running documents in
  // parallel would just race the same rate limits a free/shared embedding
  // key is most likely to hit.
  const [reembedProgress, setReembedProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const reembedMutation = useMutation({
    mutationFn: async () => {
      const { queued } = await reembedAll();
      setReembedProgress({ done: 0, total: queued });
      const documents = await getDocuments();
      const toEmbed = documents.filter((doc) => doc.status !== "ready");
      let completed = 0;
      for (const doc of toEmbed) {
        let done = false;
        let guard = 0;
        while (!done && guard < 500) {
          guard += 1;
          const batch = await embedBatch({ data: { documentId: doc.id } });
          done = batch.done;
        }
        completed += 1;
        setReembedProgress({ done: completed, total: toEmbed.length });
      }
      return { reembedded: completed };
    },
    onSuccess: ({ reembedded }) => {
      toast.success(
        reembedded > 0
          ? `Re-embedded ${reembedded} document${reembedded === 1 ? "" : "s"} under the active embedding provider.`
          : "Nothing to re-embed — the knowledge base is empty.",
      );
      setReembedProgress(null);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setReembedProgress(null);
    },
  });

  const [provider, setProvider] = useState<string>(EMBEDDING_PROVIDERS[0]?.id ?? "google");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [activateNow, setActivateNow] = useState(true);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotateValue, setRotateValue] = useState("");

  const meta = providerMeta(provider);
  const embeddingModels = embeddingModelsFor(meta);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["provider-keys", "embedding"] });

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          provider: provider as never,
          purpose: "embedding",
          label: label || `${meta.label} embeddings`,
          apiKey,
          baseUrl,
          model: model || embeddingModels[0] || "",
          activate: activateNow,
        },
      }),
    onSuccess: async () => {
      toast.success("Embedding key saved. Knowledge ingestion and retrieval will use it.");
      setApiKey("");
      setLabel("");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string | null) => activate({ data: { id, purpose: "embedding" } }),
    onSuccess: async () => {
      toast.success("Active embedding provider updated.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: async () => {
      toast.success("Key removed.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => test({ data: { id } }),
    onSuccess: (result) =>
      result.ok
        ? toast.success(
            `Key works — ${result.dimensions}-dimension vector in ${result.latencyMs}ms (${result.model})`,
          )
        : toast.error(result.error ?? "Test failed."),
    onError: (error: Error) => toast.error(error.message),
  });

  const rotateMutation = useMutation({
    mutationFn: (input: { id: string; apiKey: string }) => rotate({ data: input }),
    onSuccess: async () => {
      toast.success("Key rotated. The old secret no longer works here.");
      setRotatingId(null);
      setRotateValue("");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activeKey = (keys.data ?? []).find((row) => row.isActive);

  return (
    <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
      <section className="panel rounded-xl border border-border p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="size-4 text-primary" /> Add an embedding key
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Only providers with a working embeddings endpoint are listed here — this is deliberately
          separate from the chat/marking providers, so switching one never silently changes the
          other. Accuracy of retrieval-grounded grading depends directly on this.
        </p>

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select
              value={provider}
              onValueChange={(value) => {
                setProvider(value);
                setModel(embeddingModelsFor(providerMeta(value))[0] ?? "");
                setBaseUrl("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMBEDDING_PROVIDERS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={`${meta.label} embeddings`}
            />
          </div>

          <div className="space-y-1.5">
            <Label>API key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={meta.keyHint}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Embedding model id</Label>
            <Input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={embeddingModels[0] ?? "model-id"}
            />
            {embeddingModels.length ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {embeddingModels.map((suggestion: string) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setModel(suggestion)}
                    className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>
              Base URL <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder={meta.baseUrl || "https://your-endpoint/v1"}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Make active</p>
              <p className="text-xs text-muted-foreground">
                Default for knowledge ingestion and retrieval unless a call picks a different key.
              </p>
            </div>
            <Switch checked={activateNow} onCheckedChange={setActivateNow} />
          </div>

          <Button
            className="w-full"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || apiKey.trim().length < 8}
          >
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save embedding key
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="panel flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
          <div>
            <p className="text-sm font-semibold">
              Currently embedding with:{" "}
              {activeKey
                ? `${providerMeta(activeKey.provider).label} · ${activeKey.model}`
                : "No embedding key configured yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeKey
                ? "Knowledge ingestion and retrieval-grounded grading use this by default."
                : "Add a key on the left — without one, embeddings will fail once the built-in gateway is unavailable."}
            </p>
            {reembedProgress ? (
              <p className="mt-1 text-xs font-medium text-primary">
                Re-embedding {reembedProgress.done}/{reembedProgress.total} documents…
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {activeKey ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => reembedMutation.mutate()}
                disabled={reembedMutation.isPending}
                title="Switched embedding provider or model? Re-embed everything so the knowledge base is back in one consistent vector space."
              >
                {reembedMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Re-embed knowledge base
              </Button>
            ) : null}
            {activeKey ? (
              <Button variant="outline" size="sm" onClick={() => activateMutation.mutate(null)}>
                <Plug className="size-4" /> Clear active embedding key
              </Button>
            ) : null}
          </div>
        </div>

        {keys.isLoading ? <Skeleton className="h-28 w-full" /> : null}

        {(keys.data ?? []).map((row) => (
          <div key={row.id} className="panel rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  {row.label}
                  {row.isActive ? (
                    <Badge className="gap-1">
                      <CheckCircle2 className="size-3" /> Active
                    </Badge>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {providerMeta(row.provider).label} · {row.model} · key {row.maskedKey}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testMutation.mutate(row.id)}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Test
                </Button>
                {row.isActive ? null : (
                  <Button size="sm" onClick={() => activateMutation.mutate(row.id)}>
                    Use this
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRotateValue("");
                    setRotatingId(rotatingId === row.id ? null : row.id);
                  }}
                >
                  <RefreshCw className="size-4" /> Rotate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(row.id)}
                  aria-label={`Delete ${row.label}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            {rotatingId === row.id ? (
              <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
                <Label htmlFor={`rotate-embed-${row.id}`}>New API key</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id={`rotate-embed-${row.id}`}
                    type="password"
                    className="min-w-48 flex-1"
                    value={rotateValue}
                    onChange={(event) => setRotateValue(event.target.value)}
                    placeholder={providerMeta(row.provider).keyHint}
                  />
                  <Button
                    onClick={() => rotateMutation.mutate({ id: row.id, apiKey: rotateValue })}
                    disabled={rotateMutation.isPending || rotateValue.trim().length < 8}
                  >
                    {rotateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    Save new key
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Provider, model and active state stay the same — only the secret changes.
                </p>
              </div>
            ) : null}
          </div>
        ))}

        {keys.data && keys.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No embedding keys yet. Add one on the left — Google and OpenRouter both offer free tiers
            that work well for a 9708 knowledge base.
          </p>
        ) : null}
      </section>
    </div>
  );
}

/**
 * Separate console section for vision-purpose keys — reads handwriting
 * pages and photographed/scanned past-paper pages (MCQ/essay bank
 * extraction, including hand-drawn/printed diagrams and data tables on the
 * page). Fully independent active flag from chat and embeddings, same
 * pattern as EmbeddingsPanel above. Only providers with a real image-input
 * endpoint (VISION_PROVIDERS) are offered here.
 */
function VisionPanel() {
  const queryClient = useQueryClient();
  const list = useServerFn(listProviderKeys);
  const save = useServerFn(saveProviderKey);
  const activate = useServerFn(activateProviderKey);
  const remove = useServerFn(deleteProviderKey);
  const test = useServerFn(testVisionProviderKey);
  const rotate = useServerFn(rotateProviderKey);

  const keys = useQuery({
    queryKey: ["provider-keys", "vision"],
    queryFn: () => list({ data: { purpose: "vision" } }),
  });

  const [provider, setProvider] = useState<string>(VISION_PROVIDERS[0]?.id ?? "google");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [activateNow, setActivateNow] = useState(true);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotateValue, setRotateValue] = useState("");

  const meta = providerMeta(provider);
  const visionModels = visionModelsFor(meta);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["provider-keys", "vision"] });

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          provider: provider as never,
          purpose: "vision",
          label: label || `${meta.label} vision`,
          apiKey,
          baseUrl,
          model: model || visionModels[0] || "",
          activate: activateNow,
        },
      }),
    onSuccess: async () => {
      toast.success("Vision key saved. Handwriting OCR and MCQ/essay extraction will use it.");
      setApiKey("");
      setLabel("");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string | null) => activate({ data: { id, purpose: "vision" } }),
    onSuccess: async () => {
      toast.success("Active vision provider updated.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: async () => {
      toast.success("Key removed.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => test({ data: { id } }),
    onSuccess: (result) =>
      result.ok
        ? toast.success(
            `Key works — ${result.model} read the test image in ${result.latencyMs}ms ("${result.reply}")`,
          )
        : toast.error(result.reply),
    onError: (error: Error) => toast.error(error.message),
  });

  const rotateMutation = useMutation({
    mutationFn: (input: { id: string; apiKey: string }) => rotate({ data: input }),
    onSuccess: async () => {
      toast.success("Key rotated. The old secret no longer works here.");
      setRotatingId(null);
      setRotateValue("");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activeKey = (keys.data ?? []).find((row) => row.isActive);

  return (
    <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
      <section className="panel rounded-xl border border-border p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Eye className="size-4 text-primary" /> Add a vision key
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Powers handwriting transcription (grade/practice uploads) and MCQ/essay bank extraction
          from photographed or scanned past-paper pages — including reading the real diagrams and
          data tables printed on the page, not just typed text. Deliberately separate from the
          chat/marking and embedding providers above, so pointing this at a stronger vision model
          never changes what marks essays or what embeds the knowledge base.
        </p>

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select
              value={provider}
              onValueChange={(value) => {
                setProvider(value);
                setModel(visionModelsFor(providerMeta(value))[0] ?? "");
                setBaseUrl("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISION_PROVIDERS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={`${meta.label} vision`}
            />
          </div>

          <div className="space-y-1.5">
            <Label>API key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={meta.keyHint}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Vision model id</Label>
            <Input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={visionModels[0] ?? "model-id"}
            />
            {visionModels.length ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {visionModels.map((suggestion: string) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setModel(suggestion)}
                    className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
            {provider === "google" ? (
              <p className="pt-1 text-[11px] text-muted-foreground">
                Use the Google AI Studio id (e.g. <code>models/gemini-3.7-flash</code>) — the
                handwriting OCR path calls Google's API directly for the highest legibility.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>
              Base URL <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder={meta.baseUrl || "https://your-endpoint/v1"}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Make active</p>
              <p className="text-xs text-muted-foreground">
                Default for handwriting OCR and bank extraction unless a call picks a different key.
              </p>
            </div>
            <Switch checked={activateNow} onCheckedChange={setActivateNow} />
          </div>

          <Button
            className="w-full"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || apiKey.trim().length < 8}
          >
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save vision key
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="panel flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
          <div>
            <p className="text-sm font-semibold">
              Currently reading images with:{" "}
              {activeKey
                ? `${providerMeta(activeKey.provider).label} · ${activeKey.model}`
                : "Falls back to the active chat provider / built-in AI"}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeKey
                ? "Handwriting OCR and MCQ/essay bank extraction use this by default."
                : "Add a key on the left for the most accurate handwriting and diagram/table reads."}
            </p>
          </div>
          {activeKey ? (
            <Button variant="outline" size="sm" onClick={() => activateMutation.mutate(null)}>
              <Plug className="size-4" /> Clear active vision key
            </Button>
          ) : null}
        </div>

        {keys.isLoading ? <Skeleton className="h-28 w-full" /> : null}

        {(keys.data ?? []).map((row) => (
          <div key={row.id} className="panel rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  {row.label}
                  {row.isActive ? (
                    <Badge className="gap-1">
                      <CheckCircle2 className="size-3" /> Active
                    </Badge>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {providerMeta(row.provider).label} · {row.model} · key {row.maskedKey}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testMutation.mutate(row.id)}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Test
                </Button>
                {row.isActive ? null : (
                  <Button size="sm" onClick={() => activateMutation.mutate(row.id)}>
                    Use this
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRotateValue("");
                    setRotatingId(rotatingId === row.id ? null : row.id);
                  }}
                >
                  <RefreshCw className="size-4" /> Rotate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(row.id)}
                  aria-label={`Delete ${row.label}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            {rotatingId === row.id ? (
              <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
                <Label htmlFor={`rotate-vision-${row.id}`}>New API key</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id={`rotate-vision-${row.id}`}
                    type="password"
                    className="min-w-48 flex-1"
                    value={rotateValue}
                    onChange={(event) => setRotateValue(event.target.value)}
                    placeholder={providerMeta(row.provider).keyHint}
                  />
                  <Button
                    onClick={() => rotateMutation.mutate({ id: row.id, apiKey: rotateValue })}
                    disabled={rotateMutation.isPending || rotateValue.trim().length < 8}
                  >
                    {rotateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    Save new key
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Provider, model and active state stay the same — only the secret changes.
                </p>
              </div>
            ) : null}
          </div>
        ))}

        {keys.data && keys.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No vision keys yet. Without one, handwriting OCR and bank extraction fall back to the
            active chat provider, then the built-in gateway.
          </p>
        ) : null}
      </section>
    </div>
  );
}

const RESET_ALL_CATEGORIES: {
  category: "mcq" | "essays" | "liveExaminer";
  title: string;
  description: string;
  confirmWord: string;
}[] = [
  {
    category: "mcq",
    title: "Reset all MCQ scores",
    description:
      "Permanently deletes every MCQ attempt for every student — generated-paper history and real-past-paper history alike.",
    confirmWord: "MCQ",
  },
  {
    category: "essays",
    title: "Reset all essay scores",
    description: "Permanently deletes every essay (and its versions) for every student.",
    confirmWord: "ESSAYS",
  },
  {
    category: "liveExaminer",
    title: "Reset all Live Examiner sessions",
    description: "Permanently deletes every Live Examiner writing session for every student.",
    confirmWord: "LIVE",
  },
];

function DangerZoneSection() {
  const queryClient = useQueryClient();
  const resetAll = useServerFn(resetAllScores);
  const [target, setTarget] = useState<(typeof RESET_ALL_CATEGORIES)[number] | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const resetAllMutation = useMutation({
    mutationFn: (category: "mcq" | "essays" | "liveExaminer") => resetAll({ data: { category } }),
    onSuccess: async (result) => {
      const total = Object.values(result.counts).reduce((sum, n) => sum + n, 0);
      toast.success(
        total > 0
          ? `Cleared ${total} record${total === 1 ? "" : "s"} across every account.`
          : "Nothing to clear — already empty.",
      );
      setTarget(null);
      setConfirmText("");
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="panel rounded-xl border border-destructive/40">
      <p className="border-b border-destructive/40 px-4 py-3 text-sm font-semibold text-destructive">
        Danger zone
      </p>
      <div className="divide-y divide-border">
        {RESET_ALL_CATEGORIES.map((item) => (
          <div key={item.category} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="ml-auto border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setTarget(item);
                setConfirmText("");
              }}
            >
              Reset
            </Button>
          </div>
        ))}
      </div>

      <AlertDialog
        open={!!target}
        onOpenChange={(open) => {
          if (!open) {
            setTarget(null);
            setConfirmText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{target?.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              {target?.description} This affects every account on the platform at once and can't be
              undone. Type <span className="font-mono font-semibold">{target?.confirmWord}</span>{" "}
              below to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={target?.confirmWord}
            autoComplete="off"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetAllMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={resetAllMutation.isPending || confirmText.trim() !== target?.confirmWord}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => target && resetAllMutation.mutate(target.category)}
            >
              {resetAllMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Clearing…
                </>
              ) : (
                "Reset for everyone"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type UsageRow = {
  id: string;
  user_id: string | null;
  feature: string;
  model: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  ok: boolean;
  error_message: string | null;
  latency_ms: number | null;
  created_at: string;
};

type FeatureMetric = {
  feature: string;
  label: string;
  calls: number;
  okCalls: number;
  failedCalls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalLatencyMs: number;
  estCostUsd: number;
  estCostInr: number;
  avgLatencyMs: number;
};

type AdminMetrics = {
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCostUsd: number;
  totalCostInr: number;
  last24hTokens: number;
  last24hCostInr: number;
  liveExaminer: {
    calls: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    costInr: number;
    costUsd: number;
    avgLatencyMs: number;
  };
  essayGrader: {
    calls: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    costInr: number;
    costUsd: number;
    avgLatencyMs: number;
  };
  byFeature: FeatureMetric[];
};

function OverviewPanel() {
  const fetchOverview = useServerFn(adminOverview);
  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: () => fetchOverview() });
  const activity = useUserActivity();
  const [search, setSearch] = useState("");
  const [featureFilter, setFeatureFilter] = useState<"all" | "live_examiner" | "essay_grade" | "other">("all");

  const whoIs = new Map(
    (activity.data ?? []).map((row) => [row.userId, `${displayName(row)} ${row.email ?? ""}`]),
  );

  if (overview.isLoading) return <Skeleton className="h-64 w-full" />;

  if (overview.isError) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 space-y-3">
        <div className="flex items-center gap-2 text-destructive font-semibold">
          <XCircle className="size-5" />
          <span>Failed to load admin overview metrics</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {overview.error instanceof Error ? overview.error.message : "An unexpected server error occurred."}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => overview.refetch()}
          className="gap-2"
        >
          <RefreshCw className="size-3.5" />
          <span>Retry</span>
        </Button>
      </div>
    );
  }

  if (!overview.data) return <p className="text-sm text-muted-foreground">Nothing to show yet.</p>;

  const counts = overview.data.counts;
  const usage = overview.data.usage ?? [];
  const metrics = (overview.data as { metrics?: AdminMetrics }).metrics;

  const tiles = [
    { label: "Users", value: counts?.users ?? 0 },
    { label: "Essays marked", value: counts?.essays ?? 0 },
    { label: "Knowledge documents", value: counts?.documents ?? 0 },
    { label: "Indexed sections", value: counts?.chunks ?? 0 },
    { label: "MCQ attempts", value: counts?.attempts ?? 0 },
    { label: "Calibration anchors", value: counts?.anchors ?? 0 },
  ];

  const shownUsage = (usage as UsageRow[]).filter((row) => {
    if (featureFilter === "live_examiner") {
      if (!row.feature || !row.feature.startsWith("live_examiner")) return false;
    } else if (featureFilter === "essay_grade") {
      if (row.feature !== "grade_essay" && row.feature !== "essay_grade") return false;
    } else if (featureFilter === "other") {
      if (
        !row.feature ||
        row.feature.startsWith("live_examiner") ||
        row.feature === "grade_essay" ||
        row.feature === "essay_grade"
      )
        return false;
    }

    return matchesSearch(
      [
        row.feature,
        row.model,
        row.ok ? "ok success" : "failed error",
        row.error_message,
        row.user_id ? whoIs.get(row.user_id) : null,
      ],
      search,
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search everything below — a person, email, page, feature or error…"
          className="max-w-xl flex-1"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => overview.refetch()}
          disabled={overview.isFetching}
          className="gap-2 shrink-0"
        >
          <RefreshCw className={cn("size-3.5", overview.isFetching && "animate-spin")} />
          <span>Refresh metrics</span>
        </Button>
      </div>

      <ActivityOverview search={search} />

      {/* Real-time AI Token & Credit Analytics (Private Admin Console) */}
      <section className="panel rounded-xl border border-border p-5 space-y-5 bg-card/40">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="size-4 text-emerald-500" /> Real-time AI Token &amp; Credit Consumption
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Internal accounting of Gemini and Claude token expenditures across Live Examiner, Essay Grader, and generators.
            </p>
          </div>
          <Badge variant="outline" className="font-mono text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
            Real-time Log Active
          </Badge>
        </div>

        {/* 4 Hero KPI Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border/70 bg-background/60 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Total Tokens Consumed</span>
              <Zap className="size-3.5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold tracking-tight tabular-nums">
              {(metrics?.totalTokens ?? 0).toLocaleString()}
            </p>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span>{(metrics?.totalPromptTokens ?? 0).toLocaleString()} in / {(metrics?.totalCompletionTokens ?? 0).toLocaleString()} out</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                +{(metrics?.last24hTokens ?? 0).toLocaleString()} 24h
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-background/60 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Total Estimated Cost</span>
              <Coins className="size-3.5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
              ₹{(metrics?.totalCostInr ?? 0).toFixed(2)}
            </p>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span>${(metrics?.totalCostUsd ?? 0).toFixed(3)} USD</span>
              <span className="text-muted-foreground font-medium">
                ₹{(metrics?.last24hCostInr ?? 0).toFixed(2)} 24h
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              <span>Live Examiner</span>
              <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                {(metrics?.liveExaminer?.calls ?? 0)} calls
              </Badge>
            </div>
            <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {(metrics?.liveExaminer?.totalTokens ?? 0).toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground ml-1">tokens</span>
            </p>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span>Est: ₹{(metrics?.liveExaminer?.costInr ?? 0).toFixed(2)}</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                ⚡ ~{(metrics?.liveExaminer?.avgLatencyMs ?? 0)}ms
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-primary font-medium">
              <span>Essay Grader</span>
              <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                {(metrics?.essayGrader?.calls ?? 0)} essays
              </Badge>
            </div>
            <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {(metrics?.essayGrader?.totalTokens ?? 0).toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground ml-1">tokens</span>
            </p>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span>Est: ₹{(metrics?.essayGrader?.costInr ?? 0).toFixed(2)}</span>
              <span className="font-mono text-muted-foreground">
                ~{(metrics?.essayGrader?.avgLatencyMs ?? 0)}ms
              </span>
            </div>
          </div>
        </div>

        {/* Feature Breakdown Table */}
        {metrics?.byFeature && metrics.byFeature.length > 0 ? (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="bg-muted/40 px-3.5 py-2 text-xs font-semibold flex items-center justify-between">
              <span>Feature Breakdown &amp; Unit Economics</span>
              <span className="text-[11px] font-normal text-muted-foreground">Based on latest 500 AI calls</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/20 text-muted-foreground text-[11px]">
                  <tr>
                    <th className="px-3.5 py-2">Feature</th>
                    <th className="px-3.5 py-2 text-right">Calls</th>
                    <th className="px-3.5 py-2 text-right">Prompt In</th>
                    <th className="px-3.5 py-2 text-right">Completion Out</th>
                    <th className="px-3.5 py-2 text-right">Total Tokens</th>
                    <th className="px-3.5 py-2 text-right">Avg Latency</th>
                    <th className="px-3.5 py-2 text-right">Est. Cost (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {metrics.byFeature.map((f) => (
                    <tr key={f.feature} className="hover:bg-muted/10 transition-colors">
                      <td className="px-3.5 py-2">
                        <div className="font-medium">{f.label}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">{f.feature}</div>
                      </td>
                      <td className="px-3.5 py-2 text-right tabular-nums">
                        {f.calls}
                        {f.failedCalls > 0 ? (
                          <span className="text-destructive ml-1 text-[10px]">({f.failedCalls} fail)</span>
                        ) : null}
                      </td>
                      <td className="px-3.5 py-2 text-right tabular-nums text-muted-foreground">
                        {(f.promptTokens ?? 0).toLocaleString()}
                      </td>
                      <td className="px-3.5 py-2 text-right tabular-nums text-muted-foreground">
                        {(f.completionTokens ?? 0).toLocaleString()}
                      </td>
                      <td className="px-3.5 py-2 text-right tabular-nums font-semibold">
                        {(f.totalTokens ?? 0).toLocaleString()}
                      </td>
                      <td className="px-3.5 py-2 text-right tabular-nums text-muted-foreground">
                        {f.avgLatencyMs > 0 ? `${f.avgLatencyMs} ms` : "—"}
                      </td>
                      <td className="px-3.5 py-2 text-right tabular-nums font-medium">
                        ₹{(f.estCostInr ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      {/* Platform Totals */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <div key={tile.label} className="panel rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{tile.label}</p>
            <p className="mt-1 text-xl font-semibold">{tile.value}</p>
          </div>
        ))}
      </div>

      {/* Recent AI calls with real-time token counts and cost */}
      <div className="panel rounded-xl border border-border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">
            Recent AI calls{" "}
            <span className="font-normal text-muted-foreground">
              (latest {usage.length}
              {search || featureFilter !== "all" ? `, ${shownUsage.length} match` : ""})
            </span>
          </p>
          <div className="flex items-center gap-1.5 text-xs">
            <Button
              type="button"
              size="sm"
              variant={featureFilter === "all" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setFeatureFilter("all")}
            >
              All
            </Button>
            <Button
              type="button"
              size="sm"
              variant={featureFilter === "live_examiner" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setFeatureFilter("live_examiner")}
            >
              Live Examiner
            </Button>
            <Button
              type="button"
              size="sm"
              variant={featureFilter === "essay_grade" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setFeatureFilter("essay_grade")}
            >
              Essay Grader
            </Button>
            <Button
              type="button"
              size="sm"
              variant={featureFilter === "other" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setFeatureFilter("other")}
            >
              Others
            </Button>
          </div>
        </div>

        <div className="divide-y divide-border">
          {shownUsage.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">
              {search || featureFilter !== "all" ? "No AI calls match that filter." : "No AI calls logged yet."}
            </p>
          ) : null}
          {shownUsage.map((row) => {
            const rowTokens = (row.prompt_tokens ?? 0) + (row.completion_tokens ?? 0);
            const rowCostInr = (((row.prompt_tokens ?? 0) * 0.00000015 + (row.completion_tokens ?? 0) * 0.00000060) * 86.5);
            return (
              <div key={row.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-xs hover:bg-muted/10 transition-colors">
                {row.ok ? (
                  <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                ) : (
                  <XCircle className="size-3.5 text-destructive shrink-0" />
                )}
                <Badge variant="outline" className="text-[10px] font-medium">
                  {row.feature}
                </Badge>
                <span className="text-muted-foreground text-[11px]">{row.model}</span>

                {rowTokens > 0 ? (
                  <Badge variant="secondary" className="font-mono text-[10px] tabular-nums">
                    ⚡ {rowTokens.toLocaleString()} tok ({row.prompt_tokens ?? 0} in / {row.completion_tokens ?? 0} out)
                  </Badge>
                ) : null}

                {rowCostInr > 0 ? (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    ₹{rowCostInr.toFixed(3)}
                  </span>
                ) : null}

                {row.latency_ms ? (
                  <span className="text-muted-foreground text-[11px]">{row.latency_ms} ms</span>
                ) : null}

                {row.user_id && whoIs.get(row.user_id) ? (
                  <span className="truncate text-muted-foreground text-[11px]">
                    · {whoIs.get(row.user_id)?.trim()}
                  </span>
                ) : null}

                <span className="ml-auto text-muted-foreground text-[11px]">
                  {new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>

                {row.error_message ? (
                  <p className="w-full text-destructive text-[11px] pl-5">{row.error_message}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <DangerZoneSection />
    </div>
  );
}

function UsersPanel() {
  const queryClient = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const updateRole = useServerFn(setUserRole);
  const resetData = useServerFn(resetStudentPracticeData);
  const deleteAccount = useServerFn(deleteUserAccount);
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchUsers() });
  const activity = useUserActivity();
  const activityById = new Map((activity.data ?? []).map((row) => [row.userId, row]));
  const [search, setSearch] = useState("");

  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const roleMutation = useMutation({
    mutationFn: (input: { userId: string; role: "student" | "teacher" | "admin" }) =>
      updateRole({ data: input }),
    onSuccess: async () => {
      toast.success("Role updated.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetMutation = useMutation({
    mutationFn: (userId: string) => resetData({ data: { userId } }),
    onSuccess: (result) => {
      const total = Object.values(result.counts).reduce((sum, n) => sum + n, 0);
      toast.success(
        total > 0
          ? `Cleared ${total} record${total === 1 ? "" : "s"}.`
          : "Nothing to clear — already empty.",
      );
      setResetTarget(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteAccount({ data: { userId } }),
    onSuccess: async () => {
      toast.success("Account deleted.");
      setDeleteTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-user-activity"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (users.isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <>
      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Search by name, email, school or role"
        className="mb-4 max-w-xl"
      />
      <div className="panel divide-y divide-border rounded-xl border border-border">
        {(users.data ?? [])
          .filter((user) => {
            const extra = activityById.get(user.id);
            return matchesSearch([user.fullName, user.school, user.role, extra?.email], search);
          })
          .map((user) => {
            const extra = activityById.get(user.id);
            return (
              <div key={user.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span
                  className={
                    extra?.isOnline
                      ? "inline-block size-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]"
                      : "inline-block size-2 shrink-0 rounded-full bg-muted-foreground/30"
                  }
                  title={extra?.isOnline ? "Online now" : "Offline"}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {user.fullName ?? "Unnamed account"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {extra?.email ? `${extra.email} · ` : ""}
                    {user.school ?? "No school"} · joined{" "}
                    {new Date(user.createdAt).toLocaleDateString()}
                    {extra
                      ? ` · ${extra.isOnline ? "online now" : `last active ${timeAgo(extra.lastActivity)}`}`
                      : ""}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  {user.id === "84ff607d-83f8-43ee-aa20-b632d1e84c14" || extra?.email?.toLowerCase().includes("vaquitavoid") ? (
                    <Badge variant="outline" className="h-8 px-2.5 font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                      Sole Admin
                    </Badge>
                  ) : (
                    <Select
                      value={user.role === "admin" ? "student" : user.role}
                      onValueChange={(value) =>
                        roleMutation.mutate({
                          userId: user.id,
                          role: value as "student" | "teacher",
                        })
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    aria-label="Clear this account's practice data"
                    title="Clear practice data (essays, MCQ attempts, Live Examiner sessions)"
                    onClick={() =>
                      setResetTarget({ id: user.id, name: user.fullName ?? "this account" })
                    }
                  >
                    <Eraser className="size-4" />
                  </Button>
                  {!(user.id === "84ff607d-83f8-43ee-aa20-b632d1e84c14" || extra?.email?.toLowerCase().includes("vaquitavoid")) && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      aria-label="Delete this account"
                      title="Delete account permanently"
                      onClick={() =>
                        setDeleteTarget({ id: user.id, name: user.fullName ?? "this account" })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        {users.data && users.data.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">No accounts yet.</p>
        ) : null}
      </div>

      <AlertDialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear practice data for {resetTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes every essay, MCQ attempt, and Live Examiner writing session
              for this account — a clean slate. Their login, role, and profile are untouched. This
              can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={resetMutation.isPending}
              onClick={() => resetTarget && resetMutation.mutate(resetTarget.id)}
            >
              {resetMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Clearing…
                </>
              ) : (
                "Clear data"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the account and everything tied to it — essays, MCQ attempts,
              Live Examiner sessions, role, profile. This can't be undone and the person will be
              signed out everywhere immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
/* ------------------------------------------------------------------ */
/* Diagrams — admins add their own Cambridge diagrams to the library    */
/* ------------------------------------------------------------------ */

function DiagramsPanel() {
  const queryClient = useQueryClient();
  const list = useServerFn(listCustomDiagrams);
  const save = useServerFn(saveCustomDiagram);
  const remove = useServerFn(deleteCustomDiagram);
  const autofill = useServerFn(autofillDiagramFromImage);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const diagrams = useQuery({ queryKey: ["custom-diagrams"], queryFn: () => list() });

  const [title, setTitle] = useState("");
  const [section, setSection] = useState<"Microeconomics" | "Macroeconomics">("Microeconomics");
  const [topic, setTopic] = useState("Added by your school");
  const [level, setLevel] = useState<"AS" | "A Level" | "AS & A Level">("AS & A Level");
  const [templateId, setTemplateId] = useState(SPEC_TEMPLATES[0]?.id ?? "");
  const [represents, setRepresents] = useState("");
  const [whyUsed, setWhyUsed] = useState("");
  const [whenToDraw, setWhenToDraw] = useState("");
  const [howToRead, setHowToRead] = useState("");
  const [labels, setLabels] = useState("");
  const [mistakes, setMistakes] = useState("");
  const [tips, setTips] = useState("");
  const [specJson, setSpecJson] = useState("");

  const autofillMutation = useMutation({
    mutationFn: async (file: File) => {
      const [image] = await filesToPageImages([file]);
      if (!image) throw new Error("Could not read that photo.");
      return autofill({ data: { image } });
    },
    onSuccess: (draft) => {
      setTitle(draft.title);
      setSection(draft.section);
      setLevel(draft.level);
      setTopic(draft.topic);
      if (SPEC_TEMPLATES.some((item) => item.id === draft.templateId)) {
        setTemplateId(draft.templateId);
      }
      setRepresents(draft.represents);
      setWhyUsed(draft.whyUsed);
      setWhenToDraw(draft.whenToDraw);
      setHowToRead(draft.howToRead.join("\n"));
      setLabels(draft.labels.join("\n"));
      setMistakes(draft.mistakes.join("\n"));
      setTips(draft.tips.join("\n"));
      setSpecJson("");
      toast.success("Drafted from the photo — review each field, then add it.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const templatePreview = templateSpec(templateId);
  const parsedSpec = (() => {
    if (!specJson.trim()) return { spec: templatePreview, error: null as string | null };
    try {
      return { spec: JSON.parse(specJson), error: null as string | null };
    } catch {
      return { spec: null, error: "That geometry JSON is not valid." };
    }
  })();

  const toLines = (value: string) =>
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          title,
          section,
          topic,
          level,
          represents,
          whyUsed,
          whenToDraw,
          howToRead: toLines(howToRead),
          labels: toLines(labels).map((line) => {
            const [symbol, ...rest] = line.split("=");
            return { symbol: (symbol ?? "").trim(), meaning: rest.join("=").trim() };
          }),
          mistakes: toLines(mistakes),
          tips: toLines(tips),
          realWorld: [],
          related: [],
          examQuestions: [],
          spec: parsedSpec.spec as Record<string, unknown>,
        },
      }),
    onSuccess: async () => {
      toast.success("Diagram added to the library.");
      setTitle("");
      setRepresents("");
      setWhyUsed("");
      setWhenToDraw("");
      setHowToRead("");
      setLabels("");
      setMistakes("");
      setTips("");
      setSpecJson("");
      await queryClient.invalidateQueries({ queryKey: ["custom-diagrams"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: async () => {
      toast.success("Diagram removed.");
      await queryClient.invalidateQueries({ queryKey: ["custom-diagrams"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[440px_1fr]">
      <section className="panel space-y-3 rounded-xl border border-border p-5">
        <h2 className="text-sm font-semibold">Add a diagram</h2>
        <p className="text-xs text-muted-foreground">
          Start from an exam-convention template, then rewrite the geometry if you need something
          different. New diagrams appear in the diagram library for every student.
        </p>

        <div className="space-y-1.5 rounded-lg border border-dashed border-border bg-muted/30 p-3">
          <Label className="flex items-center gap-1.5 text-xs font-medium">
            <Sparkles className="size-3.5" /> Quick add from a photo
          </Label>
          <p className="text-xs text-muted-foreground">
            Photograph a diagram from a coursebook, whiteboard or past paper — every field below
            gets drafted for you to review, instead of typing it all out by hand.
          </p>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) autofillMutation.mutate(file);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            disabled={autofillMutation.isPending}
            onClick={() => photoInputRef.current?.click()}
          >
            {autofillMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Reading diagram…
              </>
            ) : (
              <>
                <ImagePlus className="size-4" /> Photograph or upload a diagram
              </>
            )}
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Minimum wage in a labour market"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Section</Label>
            <Select value={section} onValueChange={(value) => setSection(value as never)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Microeconomics">Microeconomics</SelectItem>
                <SelectItem value="Macroeconomics">Macroeconomics</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Level</Label>
            <Select value={level} onValueChange={(value) => setLevel(value as never)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AS">AS</SelectItem>
                <SelectItem value="A Level">A Level</SelectItem>
                <SelectItem value="AS &amp; A Level">AS &amp; A Level</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Topic group</Label>
          <Input value={topic} onChange={(event) => setTopic(event.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Geometry template</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {SPEC_TEMPLATES.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>
            What it represents <span className="text-muted-foreground">(one paragraph)</span>
          </Label>
          <Textarea rows={2} value={represents} onChange={(e) => setRepresents(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Why Cambridge uses it</Label>
          <Textarea rows={2} value={whyUsed} onChange={(e) => setWhyUsed(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>When to draw it</Label>
          <Textarea rows={2} value={whenToDraw} onChange={(e) => setWhenToDraw(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>
            How to read it <span className="text-muted-foreground">(one step per line)</span>
          </Label>
          <Textarea rows={3} value={howToRead} onChange={(e) => setHowToRead(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>
            Labels <span className="text-muted-foreground">(one per line, e.g. P = price)</span>
          </Label>
          <Textarea rows={3} value={labels} onChange={(e) => setLabels(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>
            Common mistakes <span className="text-muted-foreground">(one per line)</span>
          </Label>
          <Textarea rows={2} value={mistakes} onChange={(e) => setMistakes(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>
            Examiner tips <span className="text-muted-foreground">(one per line)</span>
          </Label>
          <Textarea rows={2} value={tips} onChange={(e) => setTips(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>
            Geometry JSON <span className="text-muted-foreground">(optional override)</span>
          </Label>
          <Textarea
            rows={4}
            className="font-mono text-[12px]"
            value={specJson}
            onChange={(event) => setSpecJson(event.target.value)}
            placeholder={JSON.stringify(templatePreview ?? {}).slice(0, 120)}
          />
          {parsedSpec.error ? <p className="text-xs text-destructive">{parsedSpec.error}</p> : null}
        </div>

        <Button
          className="w-full"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || title.trim().length < 3 || !parsedSpec.spec}
        >
          {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Add to diagram library
        </Button>
      </section>

      <section className="space-y-3">
        <div className="panel rounded-xl border border-border p-4">
          <p className="text-sm font-semibold">Preview</p>
          {parsedSpec.spec ? (
            <div className="mt-3">
              <EconomicsDiagram
                spec={parsedSpec.spec as never}
                title={title || "Untitled diagram"}
              />
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Fix the geometry JSON to preview.</p>
          )}
        </div>

        {diagrams.isLoading ? <Skeleton className="h-24 w-full" /> : null}

        {(diagrams.data ?? []).map((row) => (
          <div
            key={row.id}
            className="panel flex flex-wrap items-center gap-3 rounded-xl border border-border p-4"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.title}</p>
              <p className="text-xs text-muted-foreground">
                {row.section} · {row.topic} · {row.level}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => deleteMutation.mutate(row.id)}
              aria-label={`Delete ${row.title}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}

        {diagrams.data && diagrams.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No custom diagrams yet — the library still shows all built-in Cambridge diagrams.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function ShowcaseAdminPanel() {
  const queryClient = useQueryClient();
  const listShowcase = useServerFn(adminListShowcaseEssays);
  const toggleVisibility = useServerFn(adminToggleShowcaseVisibility);
  const addExemplar = useServerFn(adminAddShowcaseExemplar);
  const deleteExemplar = useServerFn(adminDeleteShowcaseExemplar);

  const query = useQuery({
    queryKey: ["admin-showcase-essays"],
    queryFn: () => listShowcase(),
  });

  const [search, setSearch] = useState("");
  const [question, setQuestion] = useState("");
  const [maxMark, setMaxMark] = useState<number>(12);
  const [totalMark, setTotalMark] = useState<number>(12);
  const [ao1, setAo1] = useState<number | undefined>(2);
  const [ao2, setAo2] = useState<number | undefined>(6);
  const [ao3, setAo3] = useState<number | undefined>(4);
  const [topicName, setTopicName] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [examinerSummary, setExaminerSummary] = useState("");
  const [essayText, setEssayText] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-showcase-essays"] });
    queryClient.invalidateQueries({ queryKey: ["showcase-essays"] });
  };

  const addMutation = useMutation({
    mutationFn: () =>
      addExemplar({
        data: {
          question,
          maxMark,
          totalMark,
          ao1Awarded: ao1,
          ao2Awarded: ao2,
          ao3Awarded: ao3,
          topicName: topicName || undefined,
          authorName: authorName || undefined,
          examinerSummary: examinerSummary || undefined,
          essayText,
        },
      }),
    onSuccess: async () => {
      toast.success("Exemplar essay added to Showcase.");
      setQuestion("");
      setEssayText("");
      setExaminerSummary("");
      setTopicName("");
      setAuthorName("");
      await refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (input: { versionId: string; hidden: boolean }) =>
      toggleVisibility({ data: input }),
    onSuccess: async (res) => {
      toast.success(
        res.hidden ? "Essay hidden from student showcase." : "Essay restored to showcase.",
      );
      await refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExemplar({ data: { id } }),
    onSuccess: async () => {
      toast.success("Essay removed from showcase.");
      await refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const allItems: ShowcaseEssayItem[] = (query.data as ShowcaseEssayItem[]) ?? [];
  const filtered = allItems.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      item.question.toLowerCase().includes(q) ||
      (item.topic_name && item.topic_name.toLowerCase().includes(q)) ||
      item.author_initials.toLowerCase().includes(q) ||
      item.essay_text.toLowerCase().includes(q)
    );
  });

  const visibleCount = allItems.filter((i) => !i.is_hidden).length;
  const hiddenCount = allItems.filter((i) => i.is_hidden).length;

  return (
    <div className="grid gap-5 lg:grid-cols-[440px_1fr]">
      {/* Left: Add Exemplar */}
      <section className="panel rounded-xl border border-border p-5 space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Plus className="size-4 text-primary" /> Add Model Exemplar
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Publish verified Cambridge examiner exemplar answers directly to the Showcase.
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Question text</Label>
            <Textarea
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Evaluate whether supply-side policies are more effective than demand-side..."
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tariff</Label>
              <Select
                value={String(maxMark)}
                onValueChange={(val) => {
                  const num = Number(val);
                  setMaxMark(num);
                  setTotalMark(num);
                  if (num === 8) {
                    setAo1(3);
                    setAo2(5);
                    setAo3(undefined);
                  } else if (num === 12) {
                    setAo1(2);
                    setAo2(6);
                    setAo3(4);
                  } else if (num === 20) {
                    setAo1(4);
                    setAo2(8);
                    setAo3(8);
                  }
                }}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8">8-mark question</SelectItem>
                  <SelectItem value="12">12-mark question</SelectItem>
                  <SelectItem value="20">20-mark question</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Awarded mark</Label>
              <Input
                type="number"
                min={1}
                max={maxMark}
                value={totalMark}
                onChange={(e) => setTotalMark(Number(e.target.value))}
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">AO1 Mark</Label>
              <Input
                type="number"
                value={ao1 ?? ""}
                onChange={(e) => setAo1(e.target.value ? Number(e.target.value) : undefined)}
                className="h-8 text-xs"
                placeholder="AO1"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">AO2 Mark</Label>
              <Input
                type="number"
                value={ao2 ?? ""}
                onChange={(e) => setAo2(e.target.value ? Number(e.target.value) : undefined)}
                className="h-8 text-xs"
                placeholder="AO2"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">AO3 Mark</Label>
              <Input
                type="number"
                value={ao3 ?? ""}
                onChange={(e) => setAo3(e.target.value ? Number(e.target.value) : undefined)}
                className="h-8 text-xs"
                placeholder="AO3"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Topic name (optional)</Label>
              <Input
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                placeholder="e.g. Macroeconomic policy"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Author name</Label>
              <Input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Cambridge Senior Examiner"
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Examiner commentary / Band notes</Label>
            <Textarea
              rows={2}
              value={examinerSummary}
              onChange={(e) => setExaminerSummary(e.target.value)}
              placeholder="Why this essay achieves Level 5..."
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Full exemplar essay text</Label>
            <Textarea
              rows={6}
              value={essayText}
              onChange={(e) => setEssayText(e.target.value)}
              placeholder="Write or paste full model essay here..."
              className="font-serif text-xs leading-relaxed"
            />
          </div>

          <Button
            className="w-full"
            onClick={() => addMutation.mutate()}
            disabled={
              addMutation.isPending || question.trim().length < 5 || essayText.trim().length < 20
            }
          >
            {addMutation.isPending ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Plus className="mr-1.5 size-4" />
            )}
            Publish to Showcase
          </Button>
        </div>
      </section>

      {/* Right: Manage Showcase Essays */}
      <section className="space-y-4">
        <div className="panel flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
          <div>
            <h3 className="text-sm font-semibold">Showcase Repository &amp; Moderation</h3>
            <p className="text-xs text-muted-foreground">
              {visibleCount} active in student showcase • {hiddenCount} hidden from view
            </p>
          </div>
          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter showcase essays…"
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {query.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            No showcase essays match your search.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <div
                key={item.version_id}
                className={`panel rounded-xl border p-4 transition-all duration-150 ${
                  item.is_hidden
                    ? "border-destructive/30 bg-destructive/[0.02] opacity-70"
                    : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={item.is_hidden ? "destructive" : "default"}
                        className="text-[11px] font-semibold"
                      >
                        <Trophy className="mr-1 size-3" />
                        {item.total_mark} / {item.max_mark} marks
                      </Badge>

                      {item.is_hidden ? (
                        <Badge
                          variant="outline"
                          className="border-destructive/40 text-[11px] text-destructive"
                        >
                          <EyeOff className="mr-1 size-3" /> Hidden from Students
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/40 text-[11px] text-emerald-600 dark:text-emerald-400"
                        >
                          <Eye className="mr-1 size-3" /> Live in Showcase
                        </Badge>
                      )}

                      <Badge variant="secondary" className="text-[11px]">
                        {item.source === "cambridge_model"
                          ? "Cambridge Model"
                          : item.source === "teacher_model"
                            ? "Teacher Exemplar"
                            : item.source === "admin_added"
                              ? "Admin Added"
                              : "Student Auto"}
                      </Badge>

                      <span className="text-[11px] text-muted-foreground">
                        Author:{" "}
                        <strong className="font-medium text-foreground">
                          {item.author_initials}
                        </strong>
                      </span>
                    </div>

                    <p className="text-xs font-semibold leading-snug text-foreground">
                      {item.question}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        toggleMutation.mutate({
                          versionId: item.version_id,
                          hidden: !item.is_hidden,
                        })
                      }
                      disabled={toggleMutation.isPending}
                    >
                      {item.is_hidden ? (
                        <>
                          <Eye className="mr-1 size-3.5" /> Restore
                        </>
                      ) : (
                        <>
                          <EyeOff className="mr-1 size-3.5 text-muted-foreground" /> Hide
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => deleteMutation.mutate(item.version_id)}
                      disabled={deleteMutation.isPending}
                      title="Remove or permanently hide"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        setExpandedId(expandedId === item.version_id ? null : item.version_id)
                      }
                    >
                      {expandedId === item.version_id ? "Close" : "Inspect"}
                    </Button>
                  </div>
                </div>

                {expandedId === item.version_id ? (
                  <div className="mt-3 space-y-2 border-t border-border/60 pt-3 text-xs">
                    {item.grading?.examiner_summary ? (
                      <p className="rounded-md bg-muted/40 p-2.5 italic text-muted-foreground">
                        "{item.grading.examiner_summary}"
                      </p>
                    ) : null}
                    <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/20 p-3 font-serif text-foreground border border-border/40">
                      {item.essay_text}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
