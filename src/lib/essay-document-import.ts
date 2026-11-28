/**
 * One-go essay document importer for Google Docs exports (.docx, .pdf, .html),
 * Word documents, plain text/markdown, and handwritten script scans.
 *
 * Extracts:
 * 1. Auto-detected exam question & mark tariff (8 / 12 / 20) when present at top of doc.
 * 2. Cleanly paragraphed essay body text.
 * 3. Embedded diagram images from .docx / .html / .pdf pages in document order,
 *    inserting `[[DOC_DIAGRAM_i]]` slot tokens so Vision analysis replaces them
 *    in-place with `[DIAGRAM: ...]` tags before auto-grading.
 */

export type ExtractedDiagramAsset = {
  slotToken: string;
  label: string;
  dataUrl: string;
  pageNumber?: number;
};

export type ExtractedEssayDocument = {
  question: string | null;
  essayTextWithSlots: string;
  detectedMarks: 8 | 12 | 20 | null;
  diagrams: ExtractedDiagramAsset[];
  handwritingPages?: string[];
  fileKind: "docx" | "pdf" | "html" | "text" | "image";
};

export type QuestionSplitResult = {
  question: string | null;
  essayText: string;
  detectedMarks: 8 | 12 | 20 | null;
};

const MAX_DOC_DIAGRAMS = 4;
const MIN_EMBEDDED_IMAGE_BYTES = 900;

export function extractMarksFromText(text: string): 8 | 12 | 20 | null {
  if (!text) return null;
  const match = text.match(
    /(?:\[\s*(8|12|20)\s*(?:marks?)?\s*\]|\(\s*(8|12|20)\s*marks?\s*\)|\b(8|12|20)\s*marks?\b)/i,
  );
  if (!match) return null;
  const num = Number(match[1] || match[2] || match[3]);
  if (num === 8 || num === 12 || num === 20) return num;
  return null;
}

function cleanQuestionLine(raw: string): string {
  return raw
    .replace(/^(?:essay\s+)?(?:exam\s+)?question\s*(?:\d+[a-z]?)?\s*[:.\-]\s*/i, "")
    .replace(/^q(?:uestion)?\s*\d+[a-z]?\s*[:.\-]\s*/i, "")
    .replace(/^(?:prompt|topic)\s*[:.\-]\s*/i, "")
    .replace(/\s*\[\s*(?:8|12|20)\s*(?:marks?)?\s*\]\s*$/i, "")
    .replace(/\s*\(\s*(?:8|12|20)\s*marks?\s*\)\s*$/i, "")
    .trim();
}

const METADATA_LINE_RE =
  /^(?:name|student|candidate(?:\s+name|\s+number)?|date|class|grade|teacher|subject|syllabus|paper|word\s*count|cambridge(?:\s+international)?)\s*[:.\-]/i;

const COMMAND_WORD_PROMPT_RE =
  /^(?:discuss|evaluate|assess|explain|consider|analyse|analyze|examine|to\s+what\s+extent|with\s+the\s+help\s+of|compare|contrast|outline|define\s+and\s+explain|how\s+far|why\s+(?:do|does|did|is|are|might|may|would)|what\s+(?:is|are)\s+the\s+(?:causes|effects|consequences|benefits|costs|advantages|disadvantages))\b/i;

const EXPLICIT_QUESTION_PREFIX_RE =
  /^(?:(?:essay\s+)?(?:exam\s+)?question\s*(?:\d+[a-z]?)?\s*[:.\-]|q(?:uestion)?\s*\d+[a-z]?\s*[:.\-]|prompt\s*[:.\-])/i;

/**
 * Splits an uploaded essay document into an optional detected exam question,
 * detected Cambridge tariff (8 / 12 / 20), and the remaining essay body.
 * Conservative against stealing genuine opening essay sentences.
 */
export function splitQuestionAndEssay(rawText: string, fileName?: string): QuestionSplitResult {
  const normalized = (rawText || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return {
      question: null,
      essayText: "",
      detectedMarks: fileName ? extractMarksFromText(fileName) : null,
    };
  }

  const blocks = normalized
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  // Also check line-by-line within the first block in case Question + Essay are separated by a single newline
  const candidateChunks: { text: string; consumeFromBlocks: "first" | "firstLine"; lineRest?: string }[] = [];
  if (blocks.length > 0) {
    const firstBlockLines = blocks[0]!.split("\n").map((l) => l.trim()).filter(Boolean);
    if (firstBlockLines.length >= 2) {
      candidateChunks.push({
        text: firstBlockLines[0]!,
        consumeFromBlocks: "firstLine",
        lineRest: firstBlockLines.slice(1).join("\n"),
      });
    }
    candidateChunks.push({
      text: blocks[0]!,
      consumeFromBlocks: "first",
    });
  }

  // Skip leading metadata lines (e.g. "Name: ...", "Date: ...")
  let startBlockIdx = 0;
  while (
    startBlockIdx < blocks.length - 1 &&
    METADATA_LINE_RE.test(blocks[startBlockIdx]!) &&
    blocks[startBlockIdx]!.split(/\s+/).length <= 12
  ) {
    startBlockIdx++;
  }

  if (startBlockIdx > 0 && blocks[startBlockIdx]) {
    const trimmedBlocks = blocks.slice(startBlockIdx);
    const bodyText = trimmedBlocks.join("\n\n");
    const firstLines = trimmedBlocks[0]!.split("\n").map((l) => l.trim()).filter(Boolean);
    const sub = splitQuestionAndEssay(
      firstLines.length >= 2 && trimmedBlocks.length === 1 ? bodyText : trimmedBlocks.join("\n\n"),
      fileName,
    );
    return sub;
  }

  for (const cand of candidateChunks) {
    const textWithoutSlots = cand.text.replace(/\[\[DOC_DIAGRAM_\d+\]\]/g, "").trim();
    if (!textWithoutSlots) continue;

    const words = textWithoutSlots.split(/\s+/).filter(Boolean).length;
    const remainingText =
      cand.consumeFromBlocks === "firstLine"
        ? [cand.lineRest, ...blocks.slice(1)].filter(Boolean).join("\n\n").trim()
        : blocks.slice(1).join("\n\n").trim();
    const remainingWords = remainingText.replace(/\[\[DOC_DIAGRAM_\d+\]\]/g, "").split(/\s+/).filter(Boolean).length;

    if (remainingWords < 25) continue;

    const hasExplicitPrefix = EXPLICIT_QUESTION_PREFIX_RE.test(textWithoutSlots);
    const hasMarkTag = extractMarksFromText(textWithoutSlots) !== null;
    const endsWithQuestionMark = textWithoutSlots.endsWith("?");
    const startsWithCommand = COMMAND_WORD_PROMPT_RE.test(textWithoutSlots);

    const looksLikeQuestion =
      (hasExplicitPrefix && words <= 85) ||
      (startsWithCommand && words <= 65 && (hasMarkTag || endsWithQuestionMark || remainingWords >= 45)) ||
      (endsWithQuestionMark && words >= 5 && words <= 55 && remainingWords >= 45) ||
      (hasMarkTag && words >= 5 && words <= 65 && remainingWords >= 45);

    if (looksLikeQuestion) {
      const cleanedQuestion = cleanQuestionLine(textWithoutSlots);
      const detectedMarks =
        extractMarksFromText(textWithoutSlots) ??
        extractMarksFromText(remainingText.slice(0, 300)) ??
        (fileName ? extractMarksFromText(fileName) : null);

      if (cleanedQuestion.length >= 10) {
        return {
          question: cleanedQuestion,
          essayText: remainingText,
          detectedMarks,
        };
      }
    }
  }

  const detectedMarks =
    extractMarksFromText(normalized.slice(0, 400)) ??
    (fileName ? extractMarksFromText(fileName) : null);

  return {
    question: null,
    essayText: normalized,
    detectedMarks,
  };
}

/** Normalizes any image dataUrl via canvas into a crisp PNG/JPEG capped at 1400px. */
async function normalizeImageDataUrl(dataUrl: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (typeof document === "undefined") return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      // Ignore tiny icons, bullets, or spacer pixels
      if (w < 48 || h < 48) {
        resolve(null);
        return;
      }
      const maxDim = 1400;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const outW = Math.max(1, Math.round(w * scale));
      const outH = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ dataUrl, width: w, height: h });
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);
      ctx.drawImage(img, 0, 0, outW, outH);
      resolve({ dataUrl: canvas.toDataURL("image/jpeg", 0.9), width: outW, height: outH });
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function estimateBase64Bytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return 0;
  return Math.floor(((dataUrl.length - comma - 1) * 3) / 4);
}

/**
 * Extracts text paragraphs and embedded images in exact document order from an HTML tree
 * (produced by mammoth.convertToHtml for .docx, or a Google Docs .html export).
 */
async function parseHtmlWithEmbeddedDiagrams(
  html: string,
  fileName: string,
): Promise<{ rawTextWithSlots: string; diagrams: ExtractedDiagramAsset[] }> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const blocks: string[] = [];
  const diagrams: ExtractedDiagramAsset[] = [];

  const processImageSrc = async (src: string, alt?: string) => {
    if (!src || !src.startsWith("data:image/")) return;
    if (diagrams.length >= MAX_DOC_DIAGRAMS) return;
    if (estimateBase64Bytes(src) < MIN_EMBEDDED_IMAGE_BYTES) return;
    const normalized = await normalizeImageDataUrl(src);
    if (!normalized) return;
    const idx = diagrams.length;
    const slotToken = `[[DOC_DIAGRAM_${idx}]]`;
    const cleanAlt = (alt || "").replace(/\s+/g, " ").trim();
    const label =
      cleanAlt && cleanAlt.length >= 3 && cleanAlt.length <= 60 && !/^image\d*$/i.test(cleanAlt)
        ? cleanAlt
        : `Document Diagram ${idx + 1}`;
    diagrams.push({
      slotToken,
      label,
      dataUrl: normalized.dataUrl,
    });
    blocks.push(slotToken);
  };

  const walk = async (node: Node): Promise<void> => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tag = el.tagName.toLowerCase();

      if (tag === "style" || tag === "script" || tag === "head") return;

      if (tag === "img") {
        await processImageSrc(el.getAttribute("src") || "", el.getAttribute("alt") || undefined);
        return;
      }

      const isBlock = /^(p|h[1-6]|li|blockquote|div|tr|section|article)$/.test(tag);
      const hasNestedBlockOrImg = Boolean(
        el.querySelector("p, h1, h2, h3, h4, h5, h6, li, blockquote, div, tr, img"),
      );

      if (isBlock && !hasNestedBlockOrImg) {
        const text = (el.textContent || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
        if (text) blocks.push(text);
        return;
      }

      // Container element or block containing inline/nested images: walk children in order
      let inlineBuffer = "";
      const flushInline = () => {
        const trimmed = inlineBuffer.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
        if (trimmed) blocks.push(trimmed);
        inlineBuffer = "";
      };

      for (const child of Array.from(el.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          inlineBuffer += child.textContent || "";
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const childEl = child as Element;
          const cTag = childEl.tagName.toLowerCase();
          if (cTag === "img" || /^(p|h[1-6]|li|blockquote|div|tr|br|table|ul|ol)$/.test(cTag) || childEl.querySelector("img, p, h1, h2, h3, h4, h5, h6, li, div, tr")) {
            flushInline();
            await walk(childEl);
          } else {
            inlineBuffer += childEl.textContent || "";
          }
        }
      }
      flushInline();
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
      if (t) blocks.push(t);
    }
  };

  await walk(doc.body);

  if (blocks.length === 0 && doc.body.textContent) {
    blocks.push(doc.body.textContent.trim());
  }

  return {
    rawTextWithSlots: blocks.join("\n\n"),
    diagrams,
  };
}

/**
 * Extracts text + embedded diagrams from a .docx (Google Docs / Word) file.
 */
async function extractDocxBundle(
  file: File,
  onProgress?: (stage: string) => void,
): Promise<ExtractedEssayDocument> {
  onProgress?.("Reading Word / Google Doc (.docx) & extracting embedded diagrams...");
  const mammoth = await import("mammoth");
  const buffer = await file.arrayBuffer();

  const htmlResult = await mammoth.convertToHtml(
    { arrayBuffer: buffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const base64 = await image.read("base64");
        const contentType = image.contentType || "image/png";
        return { src: `data:${contentType};base64,${base64}` };
      }),
    },
  );

  const { rawTextWithSlots, diagrams } = await parseHtmlWithEmbeddedDiagrams(
    htmlResult.value || "",
    file.name,
  );

  // Fallback to extractRawText if HTML came out empty
  let finalRaw = rawTextWithSlots;
  if (!finalRaw.trim()) {
    const rawRes = await mammoth.extractRawText({ arrayBuffer: buffer });
    finalRaw = (rawRes.value || "").trim();
  }

  if (!finalRaw.trim() && diagrams.length === 0) {
    throw new Error("No readable essay text or diagrams found in this Word document.");
  }

  const split = splitQuestionAndEssay(finalRaw, file.name);
  return {
    question: split.question,
    essayTextWithSlots: split.essayText,
    detectedMarks: split.detectedMarks,
    diagrams,
    fileKind: "docx",
  };
}

/**
 * Extracts text per page + detects pages with embedded images or vector drawings in a PDF
 * (such as Google Docs -> Download -> PDF Document).
 * If total text is sparse (< 200 chars), routes pages to Handwriting Vision OCR.
 */
async function extractPdfBundle(
  file: File,
  onProgress?: (stage: string) => void,
): Promise<ExtractedEssayDocument> {
  onProgress?.("Reading PDF document & scanning pages for diagrams...");
  const { loadPdfjs, openPdfDocument } = await import("@/lib/mcq-pdf-text");
  const pdfjs = await loadPdfjs();

  const buffer = await file.arrayBuffer();
  const { doc: pdf, loadingTask } = await openPdfDocument(pdfjs, new Uint8Array(buffer), {
    disableFontFace: true,
  });

  const OPS = (pdfjs as any).OPS || {};
  const pageTexts: string[] = [];
  const diagramPageNumbers: number[] = [];

  try {
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      onProgress?.(`Scanning PDF page ${pageNum} of ${pdf.numPages}...`);
      const page = await pdf.getPage(pageNum);
      try {
        const content = await page.getTextContent();
        const items = (content.items as Array<{ str?: string; transform?: number[] }>).filter(
          (item): item is { str: string; transform?: number[] } =>
            typeof item?.str === "string",
        );

        let lastY: number | null = null;
        let line = "";
        const lines: string[] = [];
        for (const item of items) {
          const y = item.transform?.[5] ?? null;
          if (lastY !== null && y !== null && Math.abs(y - lastY) > 6) {
            if (line.trim()) lines.push(line.trim());
            line = item.str;
          } else {
            line += (line && !line.endsWith(" ") && !item.str.startsWith(" ") ? " " : "") + item.str;
          }
          if (y !== null) lastY = y;
        }
        if (line.trim()) lines.push(line.trim());

        const pageText = lines.join("\n").trim();
        pageTexts.push(pageText);

        // Detect raster images or vector drawings (e.g. Google Drawings / pasted charts) on this page
        if (diagramPageNumbers.length < MAX_DOC_DIAGRAMS) {
          try {
            const opList = await page.getOperatorList();
            let imageOps = 0;
            let vectorDrawOps = 0;
            for (const fn of opList.fnArray) {
              if (
                fn === OPS.paintImageXObject ||
                fn === OPS.paintInlineImageXObject ||
                fn === OPS.paintImageMaskXObject ||
                fn === OPS.paintImageXObjectRepeat
              ) {
                imageOps++;
              } else if (
                fn === OPS.constructPath ||
                fn === OPS.stroke ||
                fn === OPS.closeStroke ||
                fn === OPS.fill ||
                fn === OPS.eoFill
              ) {
                vectorDrawOps++;
              }
            }
            if (imageOps > 0 || vectorDrawOps >= 24) {
              diagramPageNumbers.push(pageNum);
            }
          } catch {
            // Non-fatal: continue with text
          }
        }
      } finally {
        page.cleanup();
      }
    }

    const totalText = pageTexts.join("\n\n").trim();

    // Scanned/image-only PDF -> route to Vision Handwriting + Diagram OCR
    if (totalText.replace(/\s+/g, "").length < 180) {
      onProgress?.("Scanned PDF detected — preparing pages for Vision OCR...");
      const { filesToPageImages } = await import("@/lib/handwriting-images");
      const handwritingPages = await filesToPageImages([file]);
      return {
        question: null,
        essayTextWithSlots: "",
        detectedMarks: extractMarksFromText(file.name),
        diagrams: [],
        handwritingPages,
        fileKind: "pdf",
      };
    }

    // Text-layer PDF with diagram pages: rasterize ONLY pages containing diagrams
    const diagrams: ExtractedDiagramAsset[] = [];
    const pageSlotByNumber = new Map<number, string>();

    if (diagramPageNumbers.length > 0 && typeof document !== "undefined") {
      for (const pageNum of diagramPageNumbers) {
        onProgress?.(`Extracting diagram on PDF page ${pageNum}...`);
        const page = await pdf.getPage(pageNum);
        try {
          const baseViewport = page.getViewport({ scale: 1 });
          const targetScale = Math.min(2.0, Math.max(1.2, 1300 / Math.max(baseViewport.width, baseViewport.height)));
          const viewport = page.getViewport({ scale: targetScale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(viewport.width));
          canvas.height = Math.max(1, Math.round(viewport.height));
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
            const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
            const idx = diagrams.length;
            const slotToken = `[[DOC_DIAGRAM_${idx}]]`;
            diagrams.push({
              slotToken,
              label: `Page ${pageNum} Diagram`,
              dataUrl,
              pageNumber: pageNum,
            });
            pageSlotByNumber.set(pageNum, slotToken);
          }
        } finally {
          page.cleanup();
        }
      }
    }

    const combinedPages = pageTexts.map((txt, i) => {
      const slot = pageSlotByNumber.get(i + 1);
      return slot ? (txt ? `${txt}\n\n${slot}` : slot) : txt;
    });
    const rawWithSlots = combinedPages.filter(Boolean).join("\n\n");
    const split = splitQuestionAndEssay(rawWithSlots, file.name);

    return {
      question: split.question,
      essayTextWithSlots: split.essayText,
      detectedMarks: split.detectedMarks,
      diagrams,
      fileKind: "pdf",
    };
  } finally {
    await loadingTask.destroy().catch(() => {});
  }
}

export function isSupportedEssayDocumentFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".docx") ||
    name.endsWith(".doc") ||
    name.endsWith(".pdf") ||
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".rtf") ||
    name.endsWith(".html") ||
    name.endsWith(".htm") ||
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|heic|heif)$/i.test(name) ||
    file.type === "application/pdf" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "text/plain" ||
    file.type === "text/html"
  );
}

/**
 * Extracts question, essay body, tariff, and embedded diagrams in one go
 * from any downloaded essay document (.docx, .pdf, .html, .txt, .md, .rtf, or image scan).
 */
export async function extractEssayDocumentBundle(
  file: File,
  onProgress?: (stage: string) => void,
): Promise<ExtractedEssayDocument> {
  const name = file.name.toLowerCase();

  if (
    name.endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractDocxBundle(file, onProgress);
  }

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return extractPdfBundle(file, onProgress);
  }

  if (name.endsWith(".html") || name.endsWith(".htm") || file.type === "text/html") {
    onProgress?.("Reading HTML essay & embedded diagrams...");
    const html = await file.text();
    const { rawTextWithSlots, diagrams } = await parseHtmlWithEmbeddedDiagrams(html, file.name);
    const split = splitQuestionAndEssay(rawTextWithSlots, file.name);
    return {
      question: split.question,
      essayTextWithSlots: split.essayText,
      detectedMarks: split.detectedMarks,
      diagrams,
      fileKind: "html",
    };
  }

  if (file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(name)) {
    onProgress?.("Preparing essay image for Vision OCR...");
    const { filesToPageImages } = await import("@/lib/handwriting-images");
    const handwritingPages = await filesToPageImages([file]);
    return {
      question: null,
      essayTextWithSlots: "",
      detectedMarks: extractMarksFromText(file.name),
      diagrams: [],
      handwritingPages,
      fileKind: "image",
    };
  }

  onProgress?.("Reading essay text file...");
  const { extractTextFromFile } = await import("@/lib/extract-text");
  const raw = await extractTextFromFile(file);
  const split = splitQuestionAndEssay(raw, file.name);
  return {
    question: split.question,
    essayTextWithSlots: split.essayText,
    detectedMarks: split.detectedMarks,
    diagrams: [],
    fileKind: "text",
  };
}
