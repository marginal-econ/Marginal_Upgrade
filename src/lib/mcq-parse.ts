export type Letter = "A" | "B" | "C" | "D";

/** Reads a Cambridge-style "Question / Answer / Marks" table straight out of extracted PDF text. */
export function parseAnswerKeyFromText(text: string): Record<number, Letter> {
  const re = /(\d{1,3})\s+([ABCD])\s+\d+/g;
  let m: RegExpExecArray | null;
  let expected = 1;
  const out: Record<number, Letter> = {};
  while ((m = re.exec(text)) !== null) {
    const n = parseInt(m[1], 10);
    if (n === expected) {
      out[n] = m[2] as Letter;
      expected++;
    }
  }
  return out;
}

import { loadPdfjs, openPdfDocument } from "@/lib/mcq-pdf-text";

/** Extracts every text run from a PDF File/Blob, concatenated — used to feed parseAnswerKeyFromText. */
export async function extractPdfText(file: File | Blob): Promise<string> {
  const pdfjs = await loadPdfjs();
  const buf = await file.arrayBuffer();
  const { doc, loadingTask } = await openPdfDocument(pdfjs, new Uint8Array(buf));
  try {
    let text = "";
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      try {
        const content = await page.getTextContent();
        text +=
          " " +
          content.items
            .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
            .join(" ");
      } finally {
        page.cleanup();
      }
    }
    return text;
  } finally {
    await loadingTask.destroy().catch(() => {});
  }
}
