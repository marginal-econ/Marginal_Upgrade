// Browser-side text extraction. PDFs, Word documents (.docx/.doc), and text files
// are parsed in the tab rather than on the server: keeps large file uploads off
// the request path entirely — only the extracted text is sent up.

export type ExtractProgress = (page: number, total: number) => void;

export async function extractTextFromFile(
  file: File,
  onProgress?: ExtractProgress,
): Promise<string> {
  const name = file.name.toLowerCase();

  // 1. Microsoft Word Document (.docx)
  if (
    name.endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractDocx(file);
  }

  // 2. Portable Document Format (.pdf)
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return extractPdf(file, onProgress);
  }

  // 3. Plain text, Markdown, RTF, CSV, and other text documents
  if (
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".csv") ||
    name.endsWith(".rtf") ||
    file.type.startsWith("text/")
  ) {
    const raw = await file.text();
    if (name.endsWith(".rtf")) {
      return cleanRtf(raw);
    }
    return raw.trim();
  }

  // 4. Legacy Microsoft Word Document (.doc)
  if (name.endsWith(".doc") || file.type === "application/msword") {
    return extractLegacyDoc(file);
  }

  // 5. OpenDocument or generic fallback if text content is plain readable ASCII/UTF-8
  try {
    const fallbackText = await file.text();
    if (fallbackText && fallbackText.trim().length > 15 && !/[\x00-\x08\x0E-\x1F]/.test(fallbackText.slice(0, 300))) {
      return fallbackText.trim();
    }
  } catch {}

  throw new Error(
    `Unsupported file type (${file.name}). Please upload a Word document (.docx), PDF (.pdf), or text document (.txt).`,
  );
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const buffer = await file.arrayBuffer();
  const res = await mammoth.extractRawText({ arrayBuffer: buffer });
  const text = (res.value || "").trim();
  if (!text) {
    throw new Error(
      "No readable text found in this Word document. It may be empty or contain only non-standard embedded objects.",
    );
  }
  return text;
}

function cleanRtf(raw: string): string {
  // Strip RTF control codes and formatting words
  return raw
    .replace(/\\par[d]?\s*/g, "\n")
    .replace(/\\line\s*/g, "\n")
    .replace(/\\tab\s*/g, "\t")
    .replace(/\{\*?\\[^{}]+;?\}/g, "")
    .replace(/\\([a-z]{1,32}(-?\d+)? ?|[\r\n]|[^a-z])/gi, "")
    .replace(/[\{\}]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractLegacyDoc(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  // 1. Check if the file is actually an OpenXML .docx with a .doc extension
  try {
    const mammoth = await import("mammoth");
    const res = await mammoth.extractRawText({ arrayBuffer: buffer });
    if (res.value && res.value.trim().length > 20) {
      return res.value.trim();
    }
  } catch {}

  // 2. Binary text stream extraction (printable ASCII runs of 4+ characters)
  const bytes = new Uint8Array(buffer);
  let text = "";
  let currentWord = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b >= 32 && b <= 126) {
      currentWord += String.fromCharCode(b);
    } else if (b === 10 || b === 13) {
      if (currentWord.length >= 3) {
        text += currentWord + "\n";
      }
      currentWord = "";
    } else {
      if (currentWord.length >= 3) {
        text += currentWord + " ";
      }
      currentWord = "";
    }
  }
  if (currentWord.length >= 3) text += currentWord;

  const cleaned = text
    .split("\n")
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 25 &&
        !/^(Normal|Default|Heading|Times|Calibri|Microsoft|WordDocument|CompObj|SummaryInformation)/i.test(
          l,
        ),
    )
    .join("\n\n");

  if (cleaned.length > 50) return cleaned;

  throw new Error(
    "Could not extract text from legacy .doc file. Please save your file as Word (.docx) or PDF and re-upload.",
  );
}

async function extractPdf(file: File, onProgress?: ExtractProgress): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Bundled worker URL — avoids relying on a CDN at runtime.
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true, // drastically reduces memory and CPU overhead for pure text extraction
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;

  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      try {
        const content = await page.getTextContent();

        // Rebuild line structure from item positions: PDF text items arrive as
        // fragments, and naive joining destroys the headings retrieval relies on.
        let lastY: number | null = null;
        let line = "";
        const lines: string[] = [];

        for (const item of content.items) {
          if (!("str" in item)) continue;
          const y = Math.round((item.transform?.[5] ?? 0) * 10) / 10;
          if (lastY !== null && Math.abs(y - lastY) > 2) {
            if (line.trim()) lines.push(line.trim());
            line = "";
          }
          line += item.str;
          if (item.hasEOL) {
            if (line.trim()) lines.push(line.trim());
            line = "";
          }
          lastY = y;
        }
        if (line.trim()) lines.push(line.trim());

        pages.push(lines.join("\n"));
      } finally {
        // Critical for large textbooks (100-800 pages): releases page cache in pdf.js
        page.cleanup();
      }

      onProgress?.(pageNumber, pdf.numPages);

      // Periodically yield to browser event loop every 25 pages on large books to keep UI smooth
      if (pageNumber % 25 === 0 && pageNumber < pdf.numPages) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return pages
      .join("\n\n")
      .replace(/-\n(?=[a-z])/g, "") // rejoin words hyphenated across line breaks
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } finally {
    // Release the entire PDF document and worker transport
    await loadingTask.destroy().catch(() => {});
  }
}
