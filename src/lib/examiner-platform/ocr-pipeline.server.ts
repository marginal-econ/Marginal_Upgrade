import { transcribeWithGemini } from "../ocr/gemini.server";
import type { ScriptPageTranscription } from "./types";

export type OcrInputPage = {
  pageNumber: number;
  dataUrl?: string; // Base64 data URL if available
  textFallback?: string;
};

export type OcrProcessResult = {
  pages: ScriptPageTranscription[];
  detectedQuestions: string[];
  totalWords: number;
  totalDiagrams: number;
  overallConfidence: number;
};

export async function processScriptTranscription(
  pages: OcrInputPage[],
): Promise<OcrProcessResult> {
  const processedPages: ScriptPageTranscription[] = [];
  const allDetectedQuestions = new Set<string>();
  let totalWords = 0;
  let totalDiagrams = 0;
  let confidenceSum = 0;

  for (const page of pages) {
    if (page.dataUrl) {
      try {
        const ocrOutcome = await transcribeWithGemini([page.dataUrl]);
        const rawText = ocrOutcome.text.trim();

        // Detect questions
        const detectedQuestions: string[] = [];
        const qMatches = rawText.matchAll(/(?:Question|Q|Part)\s*([0-9]+(?:\([a-z]\))?)/gi);
        for (const match of qMatches) {
          if (match[1]) detectedQuestions.push(match[1]);
        }
        detectedQuestions.forEach((q) => allDetectedQuestions.add(q));

        // Extract diagram tags
        const diagramTags: string[] = [];
        const dMatches = rawText.matchAll(/\[DIAGRAM:[^\]]*\]/g);
        for (const match of dMatches) {
          diagramTags.push(match[0]);
        }

        // Extract uncertain words
        const uncertainWords: string[] = [];
        const uMatches = rawText.matchAll(/\[\?\]/g);
        for (const match of uMatches) {
          uncertainWords.push(match[0]);
        }

        const words = rawText ? rawText.split(/\s+/).length : 0;
        totalWords += words;
        totalDiagrams += diagramTags.length;

        const hasCrossOuts =
          rawText.includes("[[CROSSED OUT:") ||
          rawText.toLowerCase().includes("crossed out") ||
          rawText.includes("~~");

        // Confidence calculation
        const confidence =
          words > 0
            ? Math.max(0.7, Math.min(0.99, 1 - (uncertainWords.length * 2) / words))
            : 0.88;
        confidenceSum += confidence;

        processedPages.push({
          page_number: page.pageNumber,
          raw_text: rawText,
          detected_questions: detectedQuestions,
          diagram_tags: diagramTags,
          uncertain_words: uncertainWords,
          has_cross_outs: hasCrossOuts,
          confidence: Math.round(confidence * 100) / 100,
        });
      } catch (err) {
        // Fallback for visual error
        const text = page.textFallback || `[Page ${page.pageNumber} scanned script]`;
        processedPages.push({
          page_number: page.pageNumber,
          raw_text: text,
          detected_questions: [],
          diagram_tags: [],
          uncertain_words: [],
          has_cross_outs: false,
          confidence: 0.7,
        });
        confidenceSum += 0.7;
      }
    } else if (page.textFallback) {
      // Deterministic extraction from text fallback
      const text = page.textFallback;
      const detected: string[] = [];
      const qMatches = text.matchAll(/(?:Question|Q|Part)\s*([0-9]+(?:\([a-z]\))?)/gi);
      for (const match of qMatches) {
        if (match[1]) detected.push(match[1]);
      }
      detected.forEach((q) => allDetectedQuestions.add(q));

      const diagramTags: string[] = [];
      const dMatches = text.matchAll(/\[DIAGRAM:[^\]]*\]/g);
      for (const match of dMatches) {
        diagramTags.push(match[0]);
      }

      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      totalWords += words;
      totalDiagrams += diagramTags.length;
      confidenceSum += 0.95;

      processedPages.push({
        page_number: page.pageNumber,
        raw_text: text,
        detected_questions: detected,
        diagram_tags: diagramTags,
        uncertain_words: [],
        has_cross_outs: false,
        confidence: 0.95,
      });
    }
  }

  const averageConfidence = pages.length > 0 ? confidenceSum / pages.length : 0.9;

  return {
    pages: processedPages,
    detectedQuestions: Array.from(allDetectedQuestions),
    totalWords,
    totalDiagrams,
    overallConfidence: Math.round(averageConfidence * 100) / 100,
  };
}

/** Segments the multi-page transcription into discrete per-question text chunks */
export function segmentTranscriptionByQuestions(
  pages: ScriptPageTranscription[],
  expectedQuestions: string[],
): Record<string, string> {
  const fullText = pages.map((p) => p.raw_text).join("\n\n");
  const result: Record<string, string> = {};

  type QuestionBoundary = {
    qNum: string;
    start: number;
  };

  const boundaries: QuestionBoundary[] = [];

  for (const qNum of expectedQuestions) {
    const escaped = qNum.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Match question headers: Question 1(a), Q1(a), Part 1(a), or 1(a) at line boundary
    const pattern = new RegExp(
      `(?:^|\\n|\\b)(?:Question\\s*|Q\\s*|Part\\s*)?(${escaped})(?:[.):\\s]|$)`,
      "gi",
    );
    const m = pattern.exec(fullText);
    if (m) {
      boundaries.push({
        qNum,
        start: m.index,
      });
    }
  }

  // Sort by appearance in student's handwritten response (handles out-of-order responses)
  boundaries.sort((a, b) => a.start - b.start);

  if (boundaries.length === 0) {
    for (const qNum of expectedQuestions) {
      result[qNum] = expectedQuestions.length === 1 ? fullText.trim() : "";
    }
    return result;
  }

  for (let i = 0; i < boundaries.length; i++) {
    const curr = boundaries[i];
    const nextStart = i + 1 < boundaries.length ? boundaries[i + 1].start : fullText.length;
    result[curr.qNum] = fullText.slice(curr.start, nextStart).trim();
  }

  // If a question was completely omitted by student, mark as blank
  for (const qNum of expectedQuestions) {
    if (result[qNum] === undefined) {
      result[qNum] = "";
    }
  }

  return result;
}
