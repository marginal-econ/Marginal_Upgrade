/**
 * MCQ Live — plain PDF helpers.
 *
 * Answer buttons are a fixed side panel (one row per question, A/B/C/D),
 * not anything placed on top of the page — so all this file does is (a)
 * load pdf.js and (b) pull a rough block of text per question number
 * straight from the PDF's text layer, purely so topic classification and
 * on-demand answer explanations have something to read. No coordinates,
 * no badges, no pills, nothing manually draggable.
 */

/**
 * Loads the legacy build of PDF.js (with core-js polyfills for
 * Map.prototype.getOrInsertComputed, URL.parse, Promise.withResolvers, etc.)
 * so PDFs render reliably on Mac Safari, iPadOS, and older laptop browsers.
 */
export async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const workerUrl = (await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjs;
}

/** Yields control to the browser event loop so heavy PDF loops never freeze the UI. */
export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined") {
      window.setTimeout(resolve, 0);
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/** Fetches a binary ArrayBuffer with a hard timeout so stalled connections fail cleanly. */
export async function fetchArrayBufferWithTimeout(
  url: string,
  timeoutMs = 15_000,
): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.arrayBuffer();
  } finally {
    clearTimeout(timer);
  }
}

export type StemBlob = { number: number; text: string };

export type QuestionPageSpan = {
  number: number;
  text: string;
  /** Top Y coordinate in PDF points (origin at bottom-left, larger = higher on page) */
  yTop: number;
  /** Bottom Y coordinate in PDF points (origin at bottom-left, smaller = lower on page) */
  yBottom: number;
};

/**
 * Groups a page's text items into lines, finds left-margin tokens that
 * look like a question number, and computes both the rough text block AND
 * the exact PDF vertical bounds (yTop..yBottom in PDF points) for each
 * question on the page so Question-by-Question Mode can crop clean real
 * PDF slices with zero hallucinated text.
 */
export type PdfTextItem = { str?: string; transform?: number[] };

export function extractQuestionSpans(
  items: PdfTextItem[],
  pageHeightPt = 842,
): QuestionPageSpan[] {
  // Check if this page is a cover/instructions sheet — cover pages NEVER contain exam questions.
  const fullPageText = items
    .map((item) => (item.str ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  const isCover =
    fullPageText.includes("READ THESE INSTRUCTIONS FIRST") ||
    fullPageText.includes("INSTRUCTIONS TO CANDIDATES") ||
    fullPageText.includes("MULTIPLE CHOICE ANSWER SHEET") ||
    fullPageText.includes("WRITE IN SOFT PENCIL") ||
    fullPageText.includes("DO NOT USE STAPLES") ||
    (fullPageText.includes("THERE ARE THIRTY QUESTIONS") && !fullPageText.includes(" 1 A "));

  if (isCover) {
    return [];
  }

  // Cluster text items into horizontal lines within a ±2.5pt Y tolerance
  // so slight baseline jitter never splits a question number from its stem.
  const rawItems: { x: number; y: number; s: string }[] = [];
  for (const item of items) {
    const s = (item.str ?? "").trim();
    if (!s) continue;
    rawItems.push({
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
      s,
    });
  }
  rawItems.sort((a, b) => b.y - a.y);

  const lineClusters: { y: number; words: { x: number; s: string }[] }[] = [];
  for (const item of rawItems) {
    const last = lineClusters[lineClusters.length - 1];
    if (last && Math.abs(last.y - item.y) <= 2.5) {
      last.words.push({ x: item.x, s: item.s });
    } else {
      lineClusters.push({ y: Math.round(item.y), words: [{ x: item.x, s: item.s }] });
    }
  }

  const numTok: { s: string; x: number; y: number; hasText: boolean }[] = [];
  let highestFooterY = 0;

  // Sort tokens on each line from left to right by x position
  for (const cluster of lineClusters) {
    const lineKey = cluster.y;
    const line = cluster.words;
    line.sort((a, b) => a.x - b.x);

    const lineStr = line
      .map((w) => w.s)
      .join(" ")
      .toUpperCase();

    // Skip running headers, footers, syllabus/variant codes, barcodes, copyright
    const isFooterOrHeader =
      lineStr.includes("UCLES") ||
      lineStr.includes("TURN OVER") ||
      lineStr.includes("BLANK PAGE") ||
      lineStr.includes("9708/") ||
      lineStr.includes("CAMBRIDGE") ||
      lineStr.includes("PAGE ");

    if (isFooterOrHeader) {
      if (lineKey < 100 && lineKey > highestFooterY) {
        highestFooterY = lineKey;
      }
      continue;
    }

    // A valid question number anchor MUST be at the left margin start of the line (e.g. "12 Which...")
    // Exclude "0" (graph origin labels) and tokens inside diagrams/tables (x > 95).
    const firstWord = line[0];
    if (firstWord && firstWord.x <= 95) {
      const match =
        /^(\d{1,2})[.)]?$/.exec(firstWord.s) ?? /^(\d{1,2})[.)]?\s+\S/.exec(firstWord.s);
      if (match) {
        const rawNum = match[1] ?? match[0];
        const parsed = parseInt(rawNum, 10);
        if (parsed >= 1 && parsed <= 40) {
          const hasText = line.length > 1 || /\s+\S/.test(firstWord.s);
          numTok.push({ s: String(parsed), x: firstWord.x, y: lineKey, hasText });
        }
      }
    }
  }

  const textBacked = numTok.filter((t) => t.hasText);
  const clusterSource = textBacked.length > 0 ? textBacked : numTok;
  const numberColumnX = pickLeftCluster(clusterSource.map((t) => t.x));
  const COLUMN_TOLERANCE = 12;
  const rawAnchors = numTok
    .filter((t) => numberColumnX !== null && Math.abs(t.x - numberColumnX) <= COLUMN_TOLERANCE)
    .map((t) => ({ num: parseInt(t.s, 10), y: t.y }))
    .sort((a, b) => b.y - a.y);

  const seenNums = new Set<number>();
  const numberAnchors = rawAnchors.filter((na) => {
    if (seenNums.has(na.num)) return false;
    seenNums.add(na.num);
    return true;
  });

  const sortedLines = lineClusters.map((c) => [c.y, c.words] as [number, { x: number; s: string }[]]);
  const safeTopCeiling = Math.max(100, pageHeightPt - 46);
  const safeBottomFloor = Math.min(92, Math.max(52, highestFooterY > 0 ? highestFooterY + 14 : 56));

  return numberAnchors.map((na, idx) => {
    const startIdx = sortedLines.findIndex(([y]) => Math.abs(y - Math.round(na.y)) < 4);
    const nextAnchor = numberAnchors[idx + 1];
    const nextStartIdx = nextAnchor
      ? sortedLines.findIndex(([y]) => Math.abs(y - Math.round(nextAnchor.y)) < 4)
      : -1;
    const endIdx = nextStartIdx > startIdx ? nextStartIdx : sortedLines.length;
    const slice = startIdx >= 0 ? sortedLines.slice(startIdx, endIdx) : [];
    const text = slice
      .map(([, words]) => words.map((w) => w.s).join(" "))
      .filter((lineText) => {
        const upper = lineText.toUpperCase();
        return (
          !upper.includes("UCLES") &&
          !upper.includes("TURN OVER") &&
          !upper.includes("BLANK PAGE") &&
          !upper.includes("9708/")
        );
      })
      .join(" ")
      .slice(0, 1400);

    const yTop = Math.min(safeTopCeiling, na.y + 22);
    const yBottom = nextAnchor
      ? Math.max(safeBottomFloor, nextAnchor.y + 18)
      : safeBottomFloor;

    return {
      number: na.num,
      text,
      yTop,
      yBottom: Math.min(yTop - 36, yBottom),
    };
  });
}

export function extractQuestionStems(items: PdfTextItem[]): StemBlob[] {
  return extractQuestionSpans(items).map(({ number, text }) => ({ number, text }));
}

/**
 * Resolves candidate question -> page sightings into the longest strictly
 * non-decreasing sequence so a single stray number match (e.g. a table value
 * on a later page) never drops all subsequent questions.
 */
export function resolveMonotonicQuestionPages(
  candidatePageMap: Record<number, number[]>,
  maxQuestionNumber: number,
  numPages: number,
): Record<number, number> {
  type Node = { q: number; p: number };
  const nodes: Node[] = [];
  for (let q = 1; q <= maxQuestionNumber; q++) {
    const sightings = candidatePageMap[q];
    if (!sightings || sightings.length === 0) continue;
    const valid = sightings.filter((p) => numPages <= 1 || q === 1 || p > 1);
    const uniqueSorted = Array.from(new Set(valid)).sort((a, b) => a - b);
    for (const p of uniqueSorted) {
      nodes.push({ q, p });
    }
  }
  if (nodes.length === 0) return {};

  const n = nodes.length;
  const dp = new Array<number>(n).fill(1);
  const prev = new Array<number>(n).fill(-1);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nodes[j].q < nodes[i].q && nodes[j].p <= nodes[i].p) {
        if (dp[j] + 1 > dp[i]) {
          dp[i] = dp[j] + 1;
          prev[i] = j;
        }
      }
    }
  }

  let bestIdx = 0;
  for (let i = 1; i < n; i++) {
    if (dp[i] > dp[bestIdx] || (dp[i] === dp[bestIdx] && nodes[i].p < nodes[bestIdx].p)) {
      bestIdx = i;
    }
  }

  const result: Record<number, number> = {};
  for (let cur = bestIdx; cur !== -1; cur = prev[cur]) {
    result[nodes[cur].q] = nodes[cur].p;
  }
  return result;
}

/**
 * Crops a single question slice out of a rendered PDF page canvas using PDF
 * point coordinates (origin bottom-left), then trims excess blank vertical
 * whitespace while preserving clean padding around text, tables, and graphs.
 */
export function cropQuestionSliceCanvas(options: {
  pageCanvas: HTMLCanvasElement;
  pageHeightPt: number;
  yTop: number;
  yBottom: number;
  scale: number;
  padPx?: number;
}): HTMLCanvasElement {
  const { pageCanvas, pageHeightPt, yTop, yBottom, scale, padPx = 22 } = options;
  const srcTop = Math.max(0, Math.floor((pageHeightPt - yTop) * scale));
  const srcBottom = Math.min(
    pageCanvas.height,
    Math.ceil((pageHeightPt - yBottom) * scale),
  );
  const rawHeight = Math.max(40, srcBottom - srcTop);

  const rawCanvas = document.createElement("canvas");
  rawCanvas.width = pageCanvas.width;
  rawCanvas.height = rawHeight;
  // willReadFrequently keeps this buffer in system RAM so getImageData never stalls GPU pipelines on laptops/Macs.
  const rawCtx = rawCanvas.getContext("2d", { willReadFrequently: true });
  if (!rawCtx) return rawCanvas;

  rawCtx.fillStyle = "#ffffff";
  rawCtx.fillRect(0, 0, rawCanvas.width, rawCanvas.height);
  rawCtx.drawImage(
    pageCanvas,
    0,
    srcTop,
    pageCanvas.width,
    rawHeight,
    0,
    0,
    pageCanvas.width,
    rawHeight,
  );

  // Trim excess trailing/leading blank white rows so short questions look crisp
  // while NEVER clipping any vector graph, line, table border, or text ink.
  try {
    const imgData = rawCtx.getImageData(0, 0, rawCanvas.width, rawCanvas.height);
    const { data, width, height } = imgData;
    const isRowInk = (row: number): boolean => {
      const rowStart = row * width * 4;
      for (let x = 0; x < width; x += 4) {
        const i = rowStart + x * 4;
        if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) {
          return true;
        }
      }
      return false;
    };

    let firstInkRow = 0;
    while (firstInkRow < height && !isRowInk(firstInkRow)) {
      firstInkRow += 1;
    }

    let lastInkRow = height - 1;
    while (lastInkRow > firstInkRow && !isRowInk(lastInkRow)) {
      lastInkRow -= 1;
    }

    if (firstInkRow < lastInkRow) {
      const trimTop = Math.max(0, firstInkRow - padPx);
      const trimBottom = Math.min(height, lastInkRow + padPx);
      const trimmedH = Math.max(80, trimBottom - trimTop);

      if (trimTop <= 6 && trimBottom >= height - 6) {
        return rawCanvas;
      }

      const trimmed = document.createElement("canvas");
      trimmed.width = rawCanvas.width;
      trimmed.height = trimmedH;
      const tCtx = trimmed.getContext("2d");
      if (tCtx) {
        tCtx.fillStyle = "#ffffff";
        tCtx.fillRect(0, 0, trimmed.width, trimmed.height);
        tCtx.drawImage(
          rawCanvas,
          0,
          trimTop,
          rawCanvas.width,
          trimmedH,
          0,
          0,
          rawCanvas.width,
          trimmedH,
        );
        // Release intermediate canvas bitmap immediately to prevent WebKit/Safari memory spikes
        rawCanvas.width = 0;
        rawCanvas.height = 0;
        return trimmed;
      }
    }
  } catch {
    // Fallback to raw untrimmed slice if canvas pixel read is unavailable
  }

  return rawCanvas;
}

/** Finds the primary question-number column X (highest count, breaking ties by leftmost). */
function pickLeftCluster(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const buckets = new Map<number, number>();
  for (const x of sorted) {
    const key = Math.round(x / 6) * 6;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const ranked = [...buckets.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0] - b[0];
  });
  return ranked.length > 0 ? ranked[0][0] : sorted[0];
}
