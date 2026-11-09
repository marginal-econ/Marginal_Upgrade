import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  RefreshCw,
  AlertCircle,
  Maximize2,
  MousePointer,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

/**
 * High-DPI, Distortion-Free PDF Page Canvas Renderer
 * Locks strict aspect ratio so no horizontal/vertical stretching ever occurs.
 */
function PdfPageCanvas({
  pdfDoc,
  pageNumber,
  zoomScale,
  containerWidth,
}: {
  pdfDoc: any;
  pageNumber: number;
  zoomScale: number;
  containerWidth: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const [aspectRatio, setAspectRatio] = useState<number>(1.414);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const ratio = baseViewport.height / baseViewport.width;
        setAspectRatio(ratio);

        // Calculate fit-to-width scale relative to available container space
        const availableWidth = Math.max(280, (containerWidth || 540) - 24);
        const fitScale = (availableWidth / baseViewport.width) * zoomScale;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2.5);

        const viewport = page.getViewport({ scale: fitScale * pixelRatio });
        const canvas = canvasRef.current;

        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);

        const displayWidth = Math.round(viewport.width / pixelRatio);

        // Strict aspect ratio locking to completely eliminate distortion
        canvas.style.width = "100%";
        canvas.style.maxWidth = `${displayWidth}px`;
        canvas.style.height = "auto";
        canvas.style.aspectRatio = `${baseViewport.width} / ${baseViewport.height}`;
        canvas.style.display = "block";

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const renderTask = page.render({
          canvasContext: ctx,
          viewport: viewport,
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error(`Page ${pageNumber} render error:`, err);
        }
      }
    };

    render();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, pageNumber, zoomScale, containerWidth]);

  return (
    <div
      id={`cambridge-page-${pageNumber}`}
      className="relative my-3 bg-white text-zinc-900 rounded shadow-md border border-zinc-200 dark:border-zinc-800 transition-all overflow-hidden mx-auto"
      style={{
        width: "100%",
        maxWidth: containerWidth ? `${containerWidth - 24}px` : "640px",
        aspectRatio: `${1} / ${aspectRatio}`,
      }}
    >
      <canvas ref={canvasRef} className="block mx-auto" />
      <div className="absolute bottom-1 right-2 bg-black/60 text-white text-[9px] font-mono px-1.5 py-0.5 rounded opacity-75 pointer-events-none select-none">
        Page {pageNumber}
      </div>
    </div>
  );
}

export function CambridgePdfViewer({
  paperId,
  pdfUrl,
  paperTitle,
  examCode,
  height = "720px",
  className,
  onFullScreenToggle,
}: CambridgePdfViewerProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.0); // 1.0 = Fit to width
  const [scrollMode, setScrollMode] = useState<"continuous" | "single">("continuous");
  const [viewMode, setViewMode] = useState<"canvas" | "native">("canvas");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string>(`${examCode || paperId}.pdf`);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(560);

  // Measure container width for responsive fit-to-width rendering
  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

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

  // Scroll Actions: Smooth Up / Down arrow scroll
  const handleScrollBy = (deltaY: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        top: deltaY,
        behavior: "smooth",
      });
    }
  };

  const handleScrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      setCurrentPage(1);
    }
  };

  const handleScrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
      setCurrentPage(numPages);
    }
  };

  const handleScrollToPage = (pageNum: number) => {
    setCurrentPage(pageNum);
    if (scrollMode === "continuous") {
      const el = document.getElementById(`cambridge-page-${pageNum}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  // Keyboard navigation support: Arrow Up / Arrow Down / PageUp / PageDown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      handleScrollBy(150);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      handleScrollBy(-150);
    } else if (e.key === "PageDown") {
      e.preventDefault();
      handleScrollBy(450);
    } else if (e.key === "PageUp") {
      e.preventDefault();
      handleScrollBy(-450);
    } else if (e.key === "Home") {
      e.preventDefault();
      handleScrollToTop();
    } else if (e.key === "End") {
      e.preventDefault();
      handleScrollToBottom();
    }
  };

  // Dedicated mouse wheel handler: stops outer window scrolling while hovering PDF
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Stop propagation so the outer main browser window never scrolls while hovering over the PDF
    e.stopPropagation();
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm",
        className
      )}
    >
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-muted/40 border-b border-border/60">
        {/* Left: Paper Tag & Mode Toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {examCode && (
            <Badge
              variant="outline"
              className="text-[11px] font-mono font-bold border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/5"
            >
              {examCode}
            </Badge>
          )}

          {pdfDoc && viewMode === "canvas" && (
            <div className="flex items-center gap-0.5 bg-background/80 p-0.5 rounded-lg border border-border/60 text-xs">
              <Button
                variant={scrollMode === "continuous" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setScrollMode("continuous")}
                className={cn(
                  "h-6 text-[10px] px-2 font-semibold transition-all",
                  scrollMode === "continuous"
                    ? "bg-muted text-primary font-bold shadow-xs"
                    : "text-muted-foreground"
                )}
                title="Continuous Scroll: View full past paper sequentially with scroll wheel"
              >
                Full Paper ({numPages}p)
              </Button>
              <Button
                variant={scrollMode === "single" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setScrollMode("single")}
                className={cn(
                  "h-6 text-[10px] px-2 font-semibold transition-all",
                  scrollMode === "single"
                    ? "bg-muted text-primary font-bold shadow-xs"
                    : "text-muted-foreground"
                )}
                title="Single Page view"
              >
                Page by Page
              </Button>
            </div>
          )}

          {/* ARROW MARKS: Direct Scroll Up / Down Buttons in Toolbar */}
          {pdfDoc && viewMode === "canvas" && (
            <div className="flex items-center gap-0.5 bg-background/80 p-0.5 rounded-lg border border-border/60 text-xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleScrollBy(-320)}
                className="h-6 px-1.5 gap-0.5 text-[10px] text-foreground font-semibold hover:bg-muted"
                title="Scroll Up (Arrow Up or Mouse Wheel Up)"
              >
                <ArrowUp className="h-3 w-3 text-primary" />
                <span className="hidden sm:inline">Up</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleScrollBy(320)}
                className="h-6 px-1.5 gap-0.5 text-[10px] text-foreground font-semibold hover:bg-muted"
                title="Scroll Down (Arrow Down or Mouse Wheel Down)"
              >
                <ArrowDown className="h-3 w-3 text-primary" />
                <span className="hidden sm:inline">Down</span>
              </Button>
            </div>
          )}

          {/* Quick Page Jump Pills */}
          {pdfDoc && viewMode === "canvas" && (
            <div className="hidden sm:flex items-center gap-1 text-[11px]">
              <span className="text-muted-foreground text-[10px] font-medium mr-0.5">Jump:</span>
              {Array.from({ length: Math.min(numPages, 4) }).map((_, idx) => {
                const p = idx + 1;
                const isSectionA = p === 2; // In CAIE 9708, Page 2 is typically Section A Extract
                return (
                  <Button
                    key={p}
                    variant={currentPage === p ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleScrollToPage(p)}
                    className={cn(
                      "h-5 px-1.5 text-[10px] font-mono",
                      isSectionA && currentPage !== p
                        ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/5"
                        : ""
                    )}
                    title={isSectionA ? "Page 2: Section A Data Response Extract" : `Page ${p}`}
                  >
                    P{p}{isSectionA ? " Extract" : ""}
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* Center: Zoom Controls */}
        {pdfDoc && viewMode === "canvas" && (
          <div className="flex items-center gap-1 bg-background/80 px-1 py-0.5 rounded-lg border border-border/60">
            <Button
              variant="ghost"
              size="sm"
              disabled={zoomScale <= 0.6}
              onClick={() => setZoomScale((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))}
              className="h-6 w-6 p-0"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="font-mono text-[10px] px-1 text-muted-foreground w-11 text-center font-semibold">
              {Math.round(zoomScale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={zoomScale >= 2.0}
              onClick={() => setZoomScale((z) => Math.min(2.0, +(z + 0.15).toFixed(2)))}
              className="h-6 w-6 p-0"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoomScale(1.0)}
              className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground font-medium"
              title="Fit to Width"
            >
              Fit
            </Button>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-1 ml-auto">
          {blobUrl && (
            <div className="hidden lg:flex items-center gap-0.5 bg-background/90 p-0.5 rounded-lg border border-border/60">
              <Button
                variant={viewMode === "canvas" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("canvas")}
                className={cn(
                  "h-6 text-[10px] px-2 font-semibold transition-all",
                  viewMode === "canvas"
                    ? "bg-muted text-primary font-bold shadow-xs"
                    : "text-muted-foreground"
                )}
                title="Canvas Renderer: 100% resilient vector view with scroll wheel"
              >
                Canvas
              </Button>
              <Button
                variant={viewMode === "native" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("native")}
                className={cn(
                  "h-6 text-[10px] px-2 font-semibold transition-all",
                  viewMode === "native"
                    ? "bg-muted text-primary font-bold shadow-xs"
                    : "text-muted-foreground"
                )}
                title="Native Browser Frame"
              >
                Browser Frame
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

      {/* VIEWER BODY WITH DEDICATED SCROLL CONTAINER & ARROW HUD */}
      <div
        className="relative flex-1 bg-zinc-100 dark:bg-zinc-950/80 overflow-hidden"
        style={{ height }}
      >
        {loading && (
          <div className="flex flex-col items-center justify-center p-8 space-y-3 text-center h-full">
            <RefreshCw className="h-8 w-8 text-primary animate-spin" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Loading authentic Cambridge examination paper…
              </p>
              <p className="text-xs text-muted-foreground">
                Rendering full paper with scroll wheel & arrow mark controls
              </p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center max-w-md mx-auto h-full">
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

        {/* NATIVE SCROLL WHEEL CONTAINER */}
        {!loading && !error && viewMode === "canvas" && pdfDoc && (
          <div
            ref={scrollContainerRef}
            tabIndex={0}
            onWheel={handleWheel}
            onKeyDown={handleKeyDown}
            className="w-full h-full overflow-y-auto overflow-x-hidden focus:outline-none focus:ring-1 focus:ring-primary/20 scrollbar-thin scrollbar-thumb-muted-foreground/30 hover:scrollbar-thumb-muted-foreground/50 transition-colors"
            style={{
              overscrollBehavior: "contain", // CRUCIAL: Keeps mouse wheel inside this container, never scrolling the outer browser page!
              scrollBehavior: "smooth",
            }}
          >
            <div className="flex flex-col items-center justify-start p-3 sm:p-4 min-h-full">
              {scrollMode === "continuous" ? (
                // Full Paper Mode: Render all pages sequentially
                Array.from({ length: numPages }).map((_, idx) => (
                  <PdfPageCanvas
                    key={idx + 1}
                    pdfDoc={pdfDoc}
                    pageNumber={idx + 1}
                    zoomScale={zoomScale}
                    containerWidth={containerWidth}
                  />
                ))
              ) : (
                // Single Page Mode: Render active page only
                <div className="w-full">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="h-7 text-xs"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                      Prev Page
                    </Button>
                    <span className="font-mono text-xs font-semibold px-2">
                      Page {currentPage} of {numPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= numPages}
                      onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                      className="h-7 text-xs"
                    >
                      Next Page
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                  <PdfPageCanvas
                    pdfDoc={pdfDoc}
                    pageNumber={currentPage}
                    zoomScale={zoomScale}
                    containerWidth={containerWidth}
                  />
                </div>
              )}

              <div className="my-4 text-center text-xs text-muted-foreground flex items-center gap-2 justify-center">
                <span>{numPages} Pages</span>
                <span>•</span>
                <span>Scroll with Mouse Wheel or Arrow Marks</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Cambridge 9708</span>
              </div>
            </div>
          </div>
        )}

        {/* FLOATING ARROW MARKS NAVIGATION HUD */}
        {!loading && !error && viewMode === "canvas" && pdfDoc && (
          <div className="absolute right-3 bottom-4 flex flex-col items-center gap-1.5 z-10 bg-background/90 backdrop-blur-md p-1.5 rounded-full border border-border/80 shadow-lg transition-all hover:bg-background">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleScrollToTop}
              className="h-7 w-7 rounded-full p-0 shadow-xs hover:bg-primary/10 hover:text-primary"
              title="Jump to Top (Page 1) [Home key]"
            >
              <ChevronsUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => handleScrollBy(-350)}
              className="h-8 w-8 rounded-full p-0 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
              title="Scroll Up [Arrow Up or Scroll Wheel]"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <div className="text-[9px] font-mono font-bold text-muted-foreground py-0.5 select-none text-center">
              P{currentPage}
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => handleScrollBy(350)}
              className="h-8 w-8 rounded-full p-0 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
              title="Scroll Down [Arrow Down or Scroll Wheel]"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleScrollToBottom}
              className="h-7 w-7 rounded-full p-0 shadow-xs hover:bg-primary/10 hover:text-primary"
              title="Jump to Bottom [End key]"
            >
              <ChevronsDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* NATIVE BROWSER PDF FRAME */}
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
