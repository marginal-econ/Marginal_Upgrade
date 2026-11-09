import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Eye,
  Columns,
  Maximize2,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getPaperPdfBase64 } from "@/lib/data-response/data-response.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CambridgePdfViewerProps {
  paperId: string;
  pdfUrl?: string;
  paperTitle: string;
  examCode?: string;
  height?: string;
  className?: string;
  onFullScreenToggle?: () => void;
}

// In-memory cache for downloaded paper base64 data to avoid redundant network requests
const pdfBase64Cache = new Map<string, { base64: string; filename: string }>();

export function CambridgePdfViewer({
  paperId,
  pdfUrl,
  paperTitle,
  examCode,
  height = "620px",
  className,
  onFullScreenToggle,
}: CambridgePdfViewerProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(1.25);
  const [viewMode, setViewMode] = useState<"canvas" | "native">("canvas");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string>(`${examCode || paperId}.pdf`);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Convert Base64 to Uint8Array and Blob URL
  const processBase64Data = useCallback(
    async (base64Data: string, filename: string) => {
      try {
        const binaryString = window.atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const blob = new Blob([bytes], { type: "application/pdf" });
        const createdBlobUrl = URL.createObjectURL(blob);
        setBlobUrl(createdBlobUrl);
        setPdfFilename(filename);

        // Load into PDF.js
        const pdfjs = await import("pdfjs-dist");
        const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

        const loadingTask = pdfjs.getDocument({
          data: bytes,
          useSystemFonts: true,
        });

        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setLoading(false);
        setError(null);
      } catch (err: any) {
        console.error("PDF processing error:", err);
        setError(err.message || "Failed to parse PDF document.");
        setLoading(false);
      }
    },
    []
  );

  // Fetch PDF base64 from server or cache
  const fetchPdf = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Check memory cache first
    const cached = pdfBase64Cache.get(paperId);
    if (cached) {
      await processBase64Data(cached.base64, cached.filename);
      return;
    }

    try {
      const res = await getPaperPdfBase64({ data: { paperId } });
      if (!res || !res.base64) {
        throw new Error("Server returned empty PDF data.");
      }

      pdfBase64Cache.set(paperId, {
        base64: res.base64,
        filename: res.filename || `${paperId}.pdf`,
      });

      await processBase64Data(res.base64, res.filename || `${paperId}.pdf`);
    } catch (err: any) {
      console.warn("Server PDF fetch failed, fallback to direct link:", err);
      setError(
        "Could not load PDF directly into viewer. You can open the authentic past paper in a new tab."
      );
      setLoading(false);
    }
  }, [paperId, processBase64Data]);

  // Trigger fetch when paperId changes
  useEffect(() => {
    fetchPdf();

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [paperId]);

  // Render current page to canvas
  useEffect(() => {
    if (!pdfDoc || viewMode !== "canvas" || !canvasRef.current) return;

    let isCancelled = false;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2.5);
        const viewport = page.getViewport({ scale: zoomLevel * pixelRatio });

        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        canvas.style.width = `${Math.round(viewport.width / pixelRatio)}px`;
        canvas.style.height = `${Math.round(viewport.height / pixelRatio)}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error("Page render failed:", err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, currentPage, zoomLevel, viewMode]);

  const handleDownload = () => {
    if (blobUrl) {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = pdfFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Downloaded ${pdfFilename}`);
    } else if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    }
  };

  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, "_blank");
    } else if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    }
  };

  return (
    <div className={cn("flex flex-col rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm", className)}>
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/40 border-b border-border/60">
        {/* Left: Paper info & Page Controls */}
        <div className="flex items-center gap-2">
          {examCode && (
            <Badge variant="outline" className="text-[11px] font-mono font-bold border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/5">
              {examCode}
            </Badge>
          )}

          {pdfDoc && viewMode === "canvas" && (
            <div className="flex items-center gap-1 bg-background/80 px-1 py-0.5 rounded-lg border border-border/60 text-xs">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-6 w-6 p-0"
                title="Previous Page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="font-mono text-[11px] px-1 font-semibold text-foreground">
                Page {currentPage} of {numPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage >= numPages}
                onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                className="h-6 w-6 p-0"
                title="Next Page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Center: Zoom controls (Canvas mode) */}
        {pdfDoc && viewMode === "canvas" && (
          <div className="flex items-center gap-1 bg-background/80 px-1 py-0.5 rounded-lg border border-border/60">
            <Button
              variant="ghost"
              size="sm"
              disabled={zoomLevel <= 0.75}
              onClick={() => setZoomLevel((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))}
              className="h-6 w-6 p-0"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="font-mono text-[11px] px-1 text-muted-foreground w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={zoomLevel >= 2.5}
              onClick={() => setZoomLevel((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}
              className="h-6 w-6 p-0"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoomLevel(1.25)}
              className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground font-medium"
              title="Fit standard zoom"
            >
              Reset
            </Button>
          </div>
        )}

        {/* Right: Mode toggle & Action buttons */}
        <div className="flex items-center gap-1.5 ml-auto">
          {blobUrl && (
            <div className="flex items-center gap-0.5 bg-background/90 p-0.5 rounded-lg border border-border/60">
              <Button
                variant={viewMode === "canvas" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("canvas")}
                className={cn(
                  "h-6 text-[10px] px-2 font-semibold transition-all",
                  viewMode === "canvas" ? "bg-muted text-primary font-bold shadow-xs" : "text-muted-foreground"
                )}
                title="Render crisp pages directly on HTML5 Canvas (100% resilient)"
              >
                Canvas Reader
              </Button>
              <Button
                variant={viewMode === "native" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("native")}
                className={cn(
                  "h-6 text-[10px] px-2 font-semibold transition-all",
                  viewMode === "native" ? "bg-muted text-primary font-bold shadow-xs" : "text-muted-foreground"
                )}
                title="Use browser built-in PDF viewer via same-origin blob"
              >
                Native Frame
              </Button>
            </div>
          )}

          {onFullScreenToggle && (
            <Button
              variant="outline"
              size="sm"
              onClick={onFullScreenToggle}
              className="h-7 text-xs gap-1 border-border/80 hover:bg-muted font-medium"
              title="Full Screen Viewer"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenNewTab}
            className="h-7 text-xs gap-1 border-border/80 hover:bg-muted font-medium"
            title="Open authentic Cambridge PDF in a separate browser tab"
          >
            <ExternalLink className="h-3 w-3" />
            <span className="hidden sm:inline">New Tab</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="h-7 px-2 text-xs border-border/80 hover:bg-muted font-medium"
            title="Download authentic Cambridge past paper PDF"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* VIEWER BODY */}
      <div
        className="relative flex-1 bg-zinc-100 dark:bg-zinc-950/80 flex items-center justify-center overflow-hidden"
        style={{ height }}
      >
        {loading && (
          <div className="flex flex-col items-center justify-center p-8 space-y-3 text-center">
            <RefreshCw className="h-8 w-8 text-primary animate-spin" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Loading authentic Cambridge examination paper…
              </p>
              <p className="text-xs text-muted-foreground">
                Rendering vector pages and data tables
              </p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center max-w-md mx-auto">
            <div className="p-3 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">
                Past Paper PDF Direct Access
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {error}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPdf}
                className="text-xs gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </Button>
              {pdfUrl && (
                <Button
                  size="sm"
                  onClick={() => window.open(pdfUrl, "_blank")}
                  className="bg-primary text-primary-foreground text-xs gap-1.5 font-bold"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Authentic Cambridge PDF
                </Button>
              )}
            </div>
          </div>
        )}

        {!loading && !error && viewMode === "canvas" && (
          <ScrollArea className="w-full h-full">
            <div className="flex flex-col items-center justify-center p-4 min-h-full">
              <div className="bg-white text-zinc-900 rounded-sm shadow-xl border border-zinc-300 dark:border-zinc-800 transition-all overflow-hidden">
                <canvas ref={canvasRef} className="block mx-auto" />
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span>Page {currentPage} of {numPages}</span>
                <span>•</span>
                <span>Cambridge Assessment International Education 9708</span>
              </div>
            </div>
          </ScrollArea>
        )}

        {!loading && !error && viewMode === "native" && blobUrl && (
          <iframe
            src={blobUrl}
            className="w-full h-full border-0 bg-white dark:bg-zinc-950"
            title={`${paperTitle} - Native PDF Viewer`}
          />
        )}
      </div>
    </div>
  );
}
