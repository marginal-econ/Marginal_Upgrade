import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Layers, Loader2, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { splitIntoChapters, type ChapterSplit } from "@/lib/chapter-split";
import { extractTextFromFile } from "@/lib/extract-text";
import { getMe } from "@/lib/account.functions";
import { cn } from "@/lib/utils";
import {
  deleteDocument,
  embedNextBatch,
  ingestDocument,
  listDocuments,
  listEmbeddingProviderOptions,
  reembedAllDocuments,
  searchKnowledge,
} from "@/lib/knowledge.functions";
import { isPdfFile, ocrPdf } from "@/lib/pdf-ocr";

const DOC_TYPES = [
  { value: "coursebook", label: "Coursebook" },
  { value: "syllabus", label: "Syllabus" },
  { value: "mark_scheme", label: "Mark scheme" },
  { value: "past_paper", label: "Past paper" },
  { value: "examiner_report", label: "Examiner report" },
  { value: "notes", label: "Class notes" },
  { value: "other", label: "Other" },
] as const;

export const Route = createFileRoute("/_authenticated/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge base — Marginal Economics" },
      {
        name: "description",
        content:
          "Upload your Economics coursebook, syllabus, mark schemes and examiner reports so every essay is marked against your own materials.",
      },
      { property: "og:title", content: "Knowledge base — Marginal Economics" },
      {
        property: "og:description",
        content: "Add PDFs and notes that ground every mark in real Cambridge source material.",
      },
    ],
  }),
  component: KnowledgePage,
});

type QueueStatus =
  "pending" | "reading" | "chunking" | "embedding" | "done" | "duplicate" | "failed";
type QueueItem = { id: string; title: string; status: QueueStatus; detail: string };

// A single PDF that splits into >= this many chapters gets a preview so a
// teacher can confirm/exclude before anything is written, rather than the
// heuristic silently deciding for them.
const MIN_PREVIEW_CHAPTERS = 2;

function KnowledgePage() {
  const queryClient = useQueryClient();
  const fetchMe = useServerFn(getMe);
  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
  const ingest = useServerFn(ingestDocument);
  const embedBatch = useServerFn(embedNextBatch);
  const removeDoc = useServerFn(deleteDocument);
  const fetchDocs = useServerFn(listDocuments);
  const search = useServerFn(searchKnowledge);
  const reembedAll = useServerFn(reembedAllDocuments);

  const docs = useQuery({ queryKey: ["documents"], queryFn: () => fetchDocs() });

  // Course materials — coursebook, syllabus, mark schemes, past papers,
  // examiner reports, notes — everything that grounds marking and coaching.
  const scopedDocs = docs.data ?? [];
  const [recalibrating, setRecalibrating] = useState(false);

  const handleRecalibrate = async () => {
    setRecalibrating(true);
    try {
      const result = await reembedAll();
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success(
        result.queued > 0
          ? `Queued ${result.queued} documents for recalibration under the active embedding provider.`
          : "No documents in library to recalibrate.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Recalibration failed.");
    } finally {
      setRecalibrating(false);
    }
  };

  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<string>("coursebook");
  const [examSeries, setExamSeries] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // Set only when a single PDF is selected and it looks like a chaptered
  // coursebook — lets the teacher confirm the split before anything is added.
  const [chapterPreview, setChapterPreview] = useState<{
    file: File;
    chapters: ChapterSplit[];
    included: boolean[];
  } | null>(null);

  const [busy, setBusy] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  // Mirrors `queue` synchronously so runQueue can read a just-updated item's
  // final status right after awaiting it, without racing React's batching.
  const queueRef = useRef<QueueItem[]>([]);

  const [query, setQuery] = useState("");
  const searchMutation = useMutation({
    mutationFn: (value: string) => search({ data: { query: value } }),
    onError: (error: Error) => toast.error(error.message),
  });

  // Which saved embedding key this specific ingestion job should use — lets
  // a teacher pick per-call instead of always inheriting whatever is active
  // in Admin → Embeddings. Defaults to "" (= use the active one / fallback).
  const listEmbeddingOptions = useServerFn(listEmbeddingProviderOptions);
  const embeddingOptions = useQuery({
    queryKey: ["embedding-provider-options"],
    queryFn: () => listEmbeddingOptions(),
    staleTime: 60_000,
  });
  const [embeddingProviderId, setEmbeddingProviderId] = useState<string>("");

  const isStaff = me.data?.isStaff ?? false;

  // Documents can be left sitting at "processing" — by a migration that
  // reset embeddings, a closed tab mid-upload, a crashed request — and
  // nothing else ever re-queues them: embedNextBatch only ever gets called
  // from inside ingestOne, right after a fresh upload. Re-uploading the
  // same file doesn't help either, since the duplicate check matches it
  // straight back to the stuck row and returns before embedding runs. So
  // pick up any "processing" document the moment the library loads (or a
  // teacher hits Retry) and drive it to completion here instead.
  const resumingRef = useRef<Set<string>>(new Set());
  const [resumingIds, setResumingIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resumeDocument = (documentId: string) => {
    if (resumingRef.current.has(documentId)) return;
    resumingRef.current.add(documentId);
    setResumingIds(new Set(resumingRef.current));

    (async () => {
      try {
        let done = false;
        let guard = 0;
        while (!done && guard < 500) {
          guard += 1;
          const batch = await embedBatch({
            data: { documentId, embeddingProviderId: embeddingProviderId || undefined },
          });
          done = batch.done;
        }
      } catch {
        // embedNextBatch already writes status: "failed" + error_message
        // on the document itself before rethrowing — the refreshed list
        // below shows that, nothing more to do here.
      } finally {
        resumingRef.current.delete(documentId);
        setResumingIds(new Set(resumingRef.current));
        queryClient.invalidateQueries({ queryKey: ["documents"] });
      }
    })();
  };

  useEffect(() => {
    (docs.data ?? [])
      .filter((doc) => doc.status === "processing" && !resumingRef.current.has(doc.id))
      .forEach((doc) => resumeDocument(doc.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs.data]);

  const reset = () => {
    setTitle("");
    setExamSeries("");
    setPastedText("");
    setFiles([]);
    setChapterPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    setOverallProgress(0);
    setQueue([]);
    queueRef.current = [];
  };

  const updateQueueItem = (id: string, patch: Partial<QueueItem>) => {
    setQueue((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      queueRef.current = next;
      return next;
    });
  };

  /** Read a single File into plain text, routing PDFs through the OCR pipeline. */
  const readFile = async (file: File, onProgress: (label: string) => void): Promise<string> => {
    if (isPdfFile(file)) {
      const outcome = await ocrPdf(file, onProgress);
      if (outcome.failedPages.length > 0) {
        toast.warning(
          `${outcome.failedPages.length} page(s) of "${file.name}" couldn't be OCR'd and were skipped.`,
        );
      }
      return outcome.text;
    }
    onProgress("Reading file…");
    return file.text();
  };

  /** Ingest one already-extracted document: chunk, store, then embed to completion. */
  const ingestOne = async (params: {
    id: string;
    text: string;
    title: string;
    sourceName?: string;
  }) => {
    if (params.text.trim().length < 200) {
      updateQueueItem(params.id, {
        status: "failed",
        detail:
          params.text.trim().length === 0
            ? "No readable text came back from this file — if it's a scanned/photographed paper, OCR found nothing. Try a clearer scan."
            : `Only ${params.text.trim().length} characters of readable text came back — too little to index. If this is a scan, check it's not blank/upside-down pages.`,
      });
      return;
    }

    updateQueueItem(params.id, {
      status: "chunking",
      detail: "Splitting into searchable sections…",
    });

    const result = await ingest({
      data: {
        title: params.title,
        docType: docType as (typeof DOC_TYPES)[number]["value"],
        sourceName: params.sourceName,
        examSeries: examSeries.trim() || undefined,
        text: params.text,
      },
    });

    if (result.duplicateOf) {
      updateQueueItem(params.id, {
        status: "duplicate",
        detail: `Already in your library as "${result.duplicateOf}".`,
      });
      return;
    }

    let done = false;
    let embedded = 0;
    while (!done) {
      const batch = await embedBatch({
        data: {
          documentId: result.documentId,
          embeddingProviderId: embeddingProviderId || undefined,
        },
      });
      embedded += batch.embedded;
      done = batch.done;
      const total = embedded + batch.remaining;
      updateQueueItem(params.id, {
        status: "embedding",
        detail: `Indexing ${embedded} of ${total} sections…`,
      });
    }

    updateQueueItem(params.id, { status: "done", detail: "Ready." });
  };

  const runQueue = async (
    items: { id: string; title: string; text: string; sourceName?: string }[],
  ) => {
    setBusy(true);
    const initial: QueueItem[] = items.map((item) => ({
      id: item.id,
      title: item.title,
      status: "pending",
      detail: "",
    }));
    setQueue(initial);
    queueRef.current = initial;
    setOverallProgress(0);

    // Tracked locally rather than read back off the `queue` state, since
    // React state updates are async/batched — reading `queue` right after
    // the loop below returned stale data and made the closing toast always
    // say "success" even when every item had actually failed or turned out
    // to be a duplicate, which is what made an upload look like it "did
    // nothing": the toast lied, so nobody thought to check the doc list.
    const outcomes: { id: string; title: string; status: QueueStatus }[] = [];

    let completed = 0;
    for (const item of items) {
      try {
        await ingestOne(item);
        const finalStatus = queueRef.current.find((row) => row.id === item.id)?.status ?? "done";
        outcomes.push({ id: item.id, title: item.title, status: finalStatus });
      } catch (error) {
        updateQueueItem(item.id, {
          status: "failed",
          detail: error instanceof Error ? error.message : "Failed to add this document.",
        });
        outcomes.push({ id: item.id, title: item.title, status: "failed" });
      }
      completed += 1;
      setOverallProgress(Math.round((completed / items.length) * 100));
    }

    setBusy(false);
    queryClient.invalidateQueries({ queryKey: ["documents"] });

    const doneCount = outcomes.filter((o) => o.status === "done").length;
    const duplicateCount = outcomes.filter((o) => o.status === "duplicate").length;
    const failedCount = outcomes.filter((o) => o.status === "failed").length;

    if (doneCount > 0 && failedCount === 0 && duplicateCount === 0) {
      toast.success(
        doneCount === 1
          ? "Document added to the knowledge base."
          : `Added ${doneCount} documents to the knowledge base.`,
      );
    } else if (doneCount === 0 && duplicateCount > 0 && failedCount === 0) {
      toast.info(
        duplicateCount === 1
          ? `Already in the knowledge base as "${outcomes.find((o) => o.status === "duplicate")?.title}".`
          : `${duplicateCount} file(s) were already in the knowledge base.`,
      );
    } else if (doneCount === 0 && failedCount > 0) {
      toast.error(
        failedCount === 1
          ? "That document could not be added — see the error below."
          : `${failedCount} document(s) could not be added — see the errors below.`,
      );
    } else {
      // Mixed outcome: some added, some duplicate/failed.
      toast.warning(
        `Added ${doneCount} of ${items.length}. ${[
          duplicateCount > 0 ? `${duplicateCount} already existed` : "",
          failedCount > 0 ? `${failedCount} failed` : "",
        ]
          .filter(Boolean)
          .join(", ")}.`,
      );
    }

    // Only clear the form (and the queue detail the person might need to
    // read) once nothing failed. On any failure, leave the queue panel
    // showing so the per-file error is visible instead of vanishing.
    if (failedCount === 0) {
      reset();
    }
  };

  /** Called once files are chosen: extract text and decide single-doc vs preview. */
  const handleFilesSelected = async (selected: File[]) => {
    setFiles(selected);
    setChapterPreview(null);
    if (selected.length === 1 && !title) {
      setTitle(selected[0]!.name.replace(/\.[^.]+$/, ""));
    }

    // Chapter-split preview only makes sense for a single PDF — with several
    // files queued at once we just add each one as its own document (or,
    // if it happens to split into chapters, those are added automatically
    // without an interactive preview, since previewing several files' worth
    // of chapters at once isn't manageable in this UI).
    // Chapter-split preview applies to any single coursebook PDF or text file
    if (
      selected.length !== 1 ||
      (!isPdfFile(selected[0]!) &&
        !selected[0]!.type.startsWith("text/") &&
        !selected[0]!.name.endsWith(".txt") &&
        !selected[0]!.name.endsWith(".md"))
    )
      return;

    const file = selected[0]!;
    try {
      setBusy(true);
      setQueue([{ id: "preview", title: file.name, status: "reading", detail: "Reading file…" }]);
      const text = await readFile(file, (label) => updateQueueItem("preview", { detail: label }));
      const baseTitle = title.trim() || file.name.replace(/\.[^.]+$/, "");
      const chapters = splitIntoChapters(text, baseTitle);
      if (chapters.length >= MIN_PREVIEW_CHAPTERS) {
        setChapterPreview({ file, chapters, included: chapters.map(() => true) });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that file.");
    } finally {
      setBusy(false);
      setQueue([]);
    }
  };

  const handleAddChapters = async () => {
    if (!chapterPreview) return;
    const selected = chapterPreview.chapters.filter((_, index) => chapterPreview.included[index]);
    if (selected.length === 0) {
      toast.error("Select at least one chapter to add.");
      return;
    }
    const currentBaseTitle = title.trim();
    await runQueue(
      selected.map((chapter, index) => {
        // If teacher modified the Title input, ensure the chapter title reflects that updated base title
        let chapterTitle = chapter.title;
        if (
          currentBaseTitle &&
          !chapterTitle.toLowerCase().startsWith(currentBaseTitle.toLowerCase())
        ) {
          chapterTitle = `${currentBaseTitle} — ${chapter.title.replace(/^.*? — /, "")}`;
        }
        return {
          id: `chapter-${index}`,
          title: chapterTitle,
          text: chapter.text,
          sourceName: chapterPreview.file.name,
        };
      }),
    );
  };

  const handleAddAsSingleDocument = async () => {
    if (!chapterPreview) return;
    const text = chapterPreview.chapters.map((chapter) => chapter.text).join("\n\n");
    await runQueue([
      {
        id: "single",
        title: title.trim() || chapterPreview.file.name.replace(/\.[^.]+$/, ""),
        text,
        sourceName: chapterPreview.file.name,
      },
    ]);
  };

  const handleUpload = async () => {
    if (chapterPreview) {
      await handleAddChapters();
      return;
    }

    try {
      if (files.length === 0) {
        const text = pastedText.trim();
        const baseTitle = title.trim() || "Coursebook Notes";
        const chapters = splitIntoChapters(text, baseTitle);
        if (chapters.length > 1) {
          await runQueue(
            chapters.map((ch, idx) => ({
              id: `pasted-ch${idx}`,
              title: ch.title,
              text: ch.text,
            })),
          );
        } else {
          await runQueue([{ id: "pasted", title: baseTitle, text }]);
        }
        return;
      }

      setBusy(true);
      setQueue(
        files.map((file, index) => ({
          id: `file-${index}`,
          title: file.name,
          status: "pending",
          detail: "",
        })),
      );
      setBusy(false);

      const items: { id: string; title: string; text: string; sourceName?: string }[] = [];
      for (let index = 0; index < files.length; index++) {
        const file = files[index]!;
        const id = `file-${index}`;
        updateQueueItem(id, { status: "reading", detail: "Reading file…" });
        try {
          const text = await readFile(file, (label) => updateQueueItem(id, { detail: label }));
          const singleTitle =
            files.length === 1
              ? title.trim() || file.name.replace(/\.[^.]+$/, "")
              : file.name.replace(/\.[^.]+$/, "");

          // Automatically split into chapters so RAG retrieval and citations are accurate
          const chapters = splitIntoChapters(text, singleTitle);

          if (chapters.length > 1) {
            chapters.forEach((chapter, chapterIndex) => {
              items.push({
                id: `${id}-ch${chapterIndex}`,
                title: chapter.title,
                text: chapter.text,
                sourceName: file.name,
              });
            });
          } else {
            items.push({
              id,
              title: chapters[0]!.title,
              text: chapters[0]!.text,
              sourceName: file.name,
            });
          }
        } catch (error) {
          updateQueueItem(id, {
            status: "failed",
            detail: error instanceof Error ? error.message : "Could not read this file.",
          });
        }
      }

      if (items.length === 0) {
        toast.error("Nothing readable was found in the selected file(s).");
        setBusy(false);
        return;
      }

      await runQueue(items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
      setBusy(false);
    }
  };

  const canSubmit = chapterPreview
    ? chapterPreview.included.some(Boolean)
    : files.length > 0 || pastedText.trim().length >= 200;

  return (
    <>
      <PageHeader
        title="Knowledge base"
        description="Add your coursebook, the 9708 syllabus, mark schemes and examiner reports. Every mark is then grounded in these documents and cited back to them."
      />

      {me.isLoading ? null : !isStaff ? (
        <div className="px-5 py-16 md:px-8">
          <div className="panel mx-auto max-w-md px-6 py-10 text-center">
            <h2 className="text-sm font-semibold">Administrators only</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The shared knowledge library is managed by administrators. Everything in it already
              grounds your marking and coaching automatically.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-6 px-5 py-6 md:px-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <div className="space-y-6">
              <div className="panel space-y-4 p-5">
                <h2 className="text-sm font-semibold">Add documents</h2>

                <div className="space-y-1.5">
                  <Label htmlFor="file">PDF or text file(s)</Label>
                  <Input
                    id="file"
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.txt,.md,application/pdf,text/plain"
                    multiple
                    disabled={busy}
                    onChange={(event) => {
                      const selected = Array.from(event.target.files ?? []);
                      void handleFilesSelected(selected);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Select several files to bulk-add them in one go. A single coursebook PDF with
                    "Chapter N" headings is automatically offered as separate chapter documents —
                    typed PDFs are read directly, scanned ones with OCR.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="title">
                    Title{files.length > 1 ? " (used per file name)" : ""}
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    disabled={busy || files.length > 1}
                    placeholder="Cambridge International AS & A Level Economics Coursebook"
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="docType">Type</Label>
                    <Select value={docType} onValueChange={setDocType} disabled={busy}>
                      <SelectTrigger id="docType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOC_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="series">Series (optional)</Label>
                    <Input
                      id="series"
                      value={examSeries}
                      disabled={busy}
                      placeholder="Nov 2024"
                      onChange={(event) => setExamSeries(event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="embeddingProvider">Embedding model</Label>
                  <Select
                    value={embeddingProviderId || "__active__"}
                    onValueChange={(value) =>
                      setEmbeddingProviderId(value === "__active__" ? "" : value)
                    }
                    disabled={busy}
                  >
                    <SelectTrigger id="embeddingProvider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__active__">
                        Use active embedding provider (Admin → Embeddings)
                      </SelectItem>
                      {(embeddingOptions.data ?? []).map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label} · {option.provider}
                          {option.isActive ? " (active)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Pick a specific saved embedding key for this batch, or leave on the active one.
                    Mixing providers across your library reduces retrieval accuracy — keep
                    everything on one provider once you're happy with results.
                  </p>
                </div>

                {files.length === 0 ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="paste">Or paste text</Label>
                    <Textarea
                      id="paste"
                      rows={5}
                      disabled={busy}
                      placeholder="Paste syllabus sections, mark scheme wording or class notes…"
                      value={pastedText}
                      onChange={(event) => setPastedText(event.target.value)}
                    />
                  </div>
                ) : null}

                {chapterPreview ? (
                  <div className="space-y-2 rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <Layers className="size-3.5 text-primary" />
                        Detected {chapterPreview.chapters.length} chapters / sections in "
                        {chapterPreview.file.name}"
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {Math.round(
                          chapterPreview.chapters.reduce((acc, c) => acc + c.text.length, 0) / 1000,
                        )}
                        k chars total
                      </span>
                    </div>
                    <div className="rounded bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary flex items-center gap-1.5">
                      <span>✓ Recommended for RAG:</span>
                      <span className="text-muted-foreground font-normal">
                        Each chapter is indexed with the textbook name for pinpoint search &
                        citations.
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Add each section as its own document, or uncheck any to exclude:</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="hover:underline font-medium text-primary cursor-pointer"
                          disabled={busy}
                          onClick={() =>
                            setChapterPreview((curr) =>
                              curr ? { ...curr, included: curr.chapters.map(() => true) } : curr,
                            )
                          }
                        >
                          Select all
                        </button>
                        <span>·</span>
                        <button
                          type="button"
                          className="hover:underline font-medium text-muted-foreground cursor-pointer"
                          disabled={busy}
                          onClick={() =>
                            setChapterPreview((curr) =>
                              curr ? { ...curr, included: curr.chapters.map(() => false) } : curr,
                            )
                          }
                        >
                          Deselect all
                        </button>
                      </div>
                    </div>
                    <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                      {chapterPreview.chapters.map((chapter, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Checkbox
                            checked={chapterPreview.included[index]}
                            onCheckedChange={(checked) =>
                              setChapterPreview((current) => {
                                if (!current) return current;
                                const included = [...current.included];
                                included[index] = checked === true;
                                return { ...current, included };
                              })
                            }
                            disabled={busy}
                          />
                          <span className="text-xs leading-snug">
                            {chapter.title}
                            <span className="text-muted-foreground">
                              {" "}
                              · {Math.round(chapter.text.length / 1000)}k characters
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground hover:text-foreground"
                      disabled={busy}
                      onClick={handleAddAsSingleDocument}
                    >
                      Add as one giant document instead (not recommended)
                    </Button>
                  </div>
                ) : null}

                {queue.length > 0 ? (
                  <div className="space-y-2">
                    {busy ? <Progress value={overallProgress} className="h-1.5" /> : null}
                    <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
                      {queue.map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-2">
                          <span className="truncate">{item.title}</span>
                          <span
                            className={
                              item.status === "failed"
                                ? "text-destructive"
                                : item.status === "done"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-muted-foreground"
                            }
                          >
                            {item.status === "pending" ? "Queued…" : item.detail || item.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <Button className="w-full" disabled={busy || !canSubmit} onClick={handleUpload}>
                  {busy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Working…
                    </>
                  ) : chapterPreview ? (
                    <>
                      <Upload className="size-4" />
                      Add {chapterPreview.included.filter(Boolean).length} chapters
                    </>
                  ) : (
                    <>
                      <Upload className="size-4" />
                      Add to knowledge base
                    </>
                  )}
                </Button>
              </div>

              <div className="panel space-y-3 p-5">
                <h2 className="text-sm font-semibold">Test retrieval</h2>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. evaluation of price ceilings"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && query.trim().length > 1) {
                        searchMutation.mutate(query.trim());
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    disabled={query.trim().length < 2 || searchMutation.isPending}
                    onClick={() => searchMutation.mutate(query.trim())}
                  >
                    {searchMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Search className="size-4" />
                    )}
                  </Button>
                </div>
                {searchMutation.data?.length ? (
                  <ul className="space-y-2.5">
                    {searchMutation.data.map((hit, index) => (
                      <li key={index} className="rounded-md border border-border p-3">
                        <p className="text-xs font-medium">
                          {hit.documentTitle}
                          {hit.heading ? ` — ${hit.heading}` : ""}{" "}
                          <span className="text-muted-foreground">
                            ({Math.round(hit.similarity * 100)}%)
                          </span>
                        </p>
                        <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                          {hit.snippet}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : searchMutation.isSuccess ? (
                  <p className="text-xs text-muted-foreground">
                    No matches yet — add more documents.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="panel">
              <div className="border-b border-border px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">Library</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {scopedDocs.length} documents ·{" "}
                    {scopedDocs.reduce((acc, d) => acc + d.chunk_count, 0)} sections indexed
                  </p>
                </div>
                {scopedDocs.length > 0 ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5"
                        disabled={busy || recalibrating || resumingIds.size > 0}
                      >
                        <RefreshCw
                          className={cn(
                            "size-3.5",
                            (recalibrating || resumingIds.size > 0) && "animate-spin",
                          )}
                        />
                        {resumingIds.size > 0
                          ? `Recalibrating (${resumingIds.size})…`
                          : "Recalibrate library"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Recalibrate Knowledge Library?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This re-indexes every document and chapter in your knowledge base under
                          the active embedding provider. It brings all stored vectors and lexical
                          index structures up to date for maximum RAG retrieval precision, chapter
                          matching, and authoritative grading citations.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRecalibrate}>
                          Recalibrate now
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </div>

              {docs.isLoading ? (
                <div className="space-y-2 p-5">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : scopedDocs.length === 0 ? (
                <p className="px-5 py-12 text-center text-sm text-muted-foreground">
                  Nothing here yet. Start with the 9708 syllabus and your coursebook.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {scopedDocs.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-3 px-5 py-3.5">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{doc.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {doc.doc_type.replace(/_/g, " ")} · {doc.chunk_count} sections ·{" "}
                          {Math.round(doc.char_count / 1000)}k characters
                          {doc.exam_series ? ` · ${doc.exam_series}` : ""}
                        </p>
                        {doc.error_message ? (
                          <p className="mt-1 text-xs text-destructive">{doc.error_message}</p>
                        ) : null}
                      </div>
                      <Badge
                        variant={
                          doc.status === "ready"
                            ? "default"
                            : doc.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                        className={cn(
                          doc.status === "processing" && "inline-flex items-center gap-1",
                        )}
                      >
                        {doc.status === "processing" && resumingIds.has(doc.id) ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : null}
                        {doc.status === "processing" && resumingIds.has(doc.id)
                          ? "resuming…"
                          : doc.status}
                      </Badge>
                      {doc.status === "failed" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={resumingIds.has(doc.id)}
                          onClick={() => resumeDocument(doc.id)}
                        >
                          Retry
                        </Button>
                      ) : null}
                      {doc.status === "processing" && !resumingIds.has(doc.id) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resumeDocument(doc.id)}
                          title="Picks up embedding exactly where it left off — already-embedded sections aren't redone."
                        >
                          Continue
                        </Button>
                      ) : null}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${doc.title}`}
                            disabled={deletingId === doc.id}
                          >
                            {deletingId === doc.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove "{doc.title}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This deletes every chunk and embedding for this document from the
                              knowledge base. Anything graded or generated using it already stays
                              as-is, but it won't be used for retrieval anymore. This can't be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async (e) => {
                                e.preventDefault();
                                setDeletingId(doc.id);
                                try {
                                  await removeDoc({ data: { id: doc.id } });
                                  queryClient.invalidateQueries({ queryKey: ["documents"] });
                                  toast.success("Removed.");
                                } catch (error) {
                                  toast.error(
                                    error instanceof Error
                                      ? "Only administrators can remove documents."
                                      : "Delete failed.",
                                  );
                                } finally {
                                  setDeletingId(null);
                                }
                              }}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
