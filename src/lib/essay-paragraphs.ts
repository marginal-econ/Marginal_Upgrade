export interface ParagraphBlock {
  index: number;
  text: string;
  isDiagram: boolean;
  textParagraphNumber: number | null;
  label: string;
  diagramTitle?: string;
}

/**
 * Robust detection of standalone inline diagram blocks (e.g. [DIAGRAM: ...], (Diagram: ...)).
 * A text block is ONLY a diagram block if it is primarily a diagram tag, not a normal
 * paragraph that happens to reference a diagram in passing.
 */
export function isDiagramBlock(
  text: string,
  diagramMatches: { matchText: string }[] = [],
): boolean {
  const t = text.trim();
  if (t.length === 0) return false;

  if (/^\[\s*(?:DIAGRAM|FIGURE|FIG|GRAPH)\s*:[^\]]+\]$/i.test(t)) return true;
  if (/^\(\s*(?:Diagram|Figure|Fig|Graph)\s*:[^)]+\)$/i.test(t)) return true;
  if (/^\{\s*(?:Diagram|Figure|Fig|Graph)\s*:[^}]+\}$/i.test(t)) return true;
  if (/^\([^)]{3,80}\)$/.test(t) && /\b(?:diagram|curve|equilibrium|shortage|surplus|ppc|ppf)\b/i.test(t)) return true;

  if (
    diagramMatches.some((m) => {
      const mt = m.matchText.trim();
      return (
        t === mt ||
        t.toLowerCase() === mt.toLowerCase() ||
        t === mt.replace(/^[(\[]|[)\]]$/g, "").trim()
      );
    })
  ) {
    return true;
  }

  if (t.length > 120 || /[.!?]\s+[A-Z]/.test(t)) {
    return false;
  }

  return false;
}

/**
 * Normalizes accidental mid-sentence hard line-wraps (e.g. from PDF or OCR pastes)
 * inside a single paragraph while preserving intentional line breaks (after colons,
 * before bullet/list items, or before short formula lines).
 */
function normalizeInternalLineBreaks(chunk: string): string {
  const lines = chunk
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length <= 1) return lines[0] || "";

  let result = lines[0];
  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1];
    const curr = lines[i];
    const isListOrBullet = /^(?:[-•*–—]\s+|\d+[.)]\s+|(?:First|Second|Third|Fourth|Finally)[,:]\s+)/i.test(curr);
    const isFormulaLine = curr.length <= 45 && /[=<>+\-×÷→]/.test(curr) && !/[.!?]$/.test(curr);
    const prevEndsWithColon = /:\s*$/.test(prev);
    const looksLikeHardWrap =
      !/[.!?:;)\]}]$/.test(prev) && /^[a-z0-9(]/.test(curr) && !isListOrBullet && !isFormulaLine;

    if (looksLikeHardWrap) {
      result += ` ${curr}`;
    } else if (prevEndsWithColon || isListOrBullet || isFormulaLine) {
      result += `\n${curr}`;
    } else {
      result += ` ${curr}`;
    }
  }
  return result;
}

/**
 * Splits a single-newline essay (no blank lines between prose paragraphs) into coherent
 * paragraphs while rejoining mid-sentence hard wraps and keeping colon-introduced
 * formulas/lists attached to their parent paragraph.
 */
function splitSingleNewlineChunk(chunk: string): string[] {
  const lines = chunk
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length <= 1) return lines;

  const paragraphs: string[] = [];
  let current = lines[0];

  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1];
    const curr = lines[i];
    const prevEndsSentence = /[.!?]["'”’)\]]*$/.test(prev);
    const prevEndsColon = /:\s*$/.test(prev);
    const currIsBullet = /^(?:[-•*–—]\s+|\d+[.)]\s+)/.test(curr);
    const currIsFormula = curr.length <= 45 && /[=<>+\-×÷→]/.test(curr) && !/[.!?]$/.test(curr);
    const currStartsLower = /^[a-z]/.test(curr);

    if (prevEndsColon || currIsBullet || currIsFormula) {
      current += `\n${curr}`;
    } else if (!prevEndsSentence || currStartsLower) {
      current += ` ${curr}`;
    } else {
      paragraphs.push(current.trim());
      current = curr;
    }
  }

  if (current.trim()) {
    paragraphs.push(current.trim());
  }

  return paragraphs;
}

/**
 * Splits essay text into discrete paragraph blocks with unified indexing and syllabus labels.
 * Handles both double-newline (\n\n) and single-newline paragraph breaks cleanly,
 * rejoins accidental PDF/OCR mid-sentence hard wraps, and ensures standalone diagram lines
 * are isolated into discrete blocks without corrupting surrounding text paragraph counts.
 */
export function parseParagraphBlocks(
  essayText: string,
  diagramMatches: { matchText: string; title: string }[] = [],
): ParagraphBlock[] {
  if (!essayText.trim()) return [];

  const normalized = essayText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  const standaloneDiagramLineRegex =
    /(^|\n)\s*(\[(?:DIAGRAM|FIGURE|FIG|GRAPH)\s*:[^\]]+\]|\((?:Diagram|Figure|Fig|Graph)\s*:[^)]+\)|\{(?:Diagram|Figure|Fig|Graph)\s*:[^}]+\})\s*(?=$|\n)/gi;

  const proseWithoutDiagrams = normalized.replace(standaloneDiagramLineRegex, "").trim();
  const hasExplicitBlankLineParagraphs = /\n\s*\n+/.test(proseWithoutDiagrams);

  const diagramDelimited = normalized.replace(standaloneDiagramLineRegex, "\n\n$2\n\n");

  const initialChunks = diagramDelimited
    .split(/\n\s*\n+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);

  const rawChunks: string[] = [];
  for (const chunk of initialChunks) {
    if (isDiagramBlock(chunk, diagramMatches)) {
      rawChunks.push(chunk);
    } else if (!hasExplicitBlankLineParagraphs && chunk.includes("\n")) {
      rawChunks.push(...splitSingleNewlineChunk(chunk));
    } else if (chunk.includes("\n")) {
      rawChunks.push(normalizeInternalLineBreaks(chunk));
    } else {
      rawChunks.push(chunk);
    }
  }

  let textCounter = 0;
  return rawChunks.map((text, index) => {
    const isDiag = isDiagramBlock(text, diagramMatches);
    if (!isDiag) {
      textCounter++;
      return {
        index,
        text,
        isDiagram: false,
        textParagraphNumber: textCounter,
        label: `¶ Paragraph ${textCounter}`,
      };
    }
    const matchingDiag = diagramMatches.find(
      (m) =>
        text.includes(m.matchText) ||
        m.matchText.includes(text) ||
        text.toLowerCase().includes(m.title.toLowerCase()),
    );
    return {
      index,
      text,
      isDiagram: true,
      textParagraphNumber: null,
      label: textCounter > 0 ? `Diagram (after ¶${textCounter})` : "Diagram (at start)",
      diagramTitle: matchingDiag?.title,
    };
  });
}
