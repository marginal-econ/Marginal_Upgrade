import { chat, visionChat } from "../ai.server";
import { getActiveVisionProvider } from "../ai/active.server";
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

const OCR_SYSTEM_PROMPT = `You are a certified Cambridge International Examination handwriting transcription engine.
Read handwritten English examination scripts exactly as written by the student.

STRICT INSTRUCTIONS:
1. Preserve student's exact wording, spelling mistakes, grammar mistakes, and line breaks.
2. DO NOT correct typos or improve style.
3. If handwriting is crossed out by the student, mark it with [[CROSSED OUT: ...]].
4. If an individual word or character cannot be read with confidence, replace it with [?]. NEVER invent or hallucinate text.
5. Identify question headers explicitly (e.g. "Question 1(a)", "Q2", "Part (b)", "Section B: Question 3").
6. HAND-DRAWN DIAGRAMS: When you see a hand-drawn graph/diagram, output a structured tag on its own line:
   [DIAGRAM: <name, e.g. Negative externality in consumption, Supply and Demand, AD/AS, PPC>
   | axes: <vertical axis label / horizontal axis label as drawn, or 'unlabelled'>
   | curves: <curves drawn, e.g. MPB, MSB, MPC, MSC and shifts>
   | labels: <equilibrium points, price P1, quantity Q1, welfare loss triangle>
   | accuracy: <factual description of what is correct, inverted, or missing>]
7. Output JSON format:
{
  "transcription": "<exact transcribed text>",
  "detected_questions": ["<question numbers found on this page, e.g. 1(a), 1(b)>"],
  "diagram_tags": ["<diagram tag strings found>"],
  "uncertain_words": ["<words replaced by [?]>"],
  "has_cross_outs": <true or false>,
  "confidence": <0.0 to 1.0>
}`;

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
        const response = await visionChat({
          system: OCR_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Transcribe page ${page.pageNumber} of this Cambridge examination script.`,
                },
                {
                  type: "image_url",
                  image_url: { url: page.dataUrl },
                },
              ],
            },
          ],
          json: true,
          maxTokens: 4000,
        });

        let parsed: any = {};
        try {
          parsed = JSON.parse(response.text);
        } catch {
          parsed = {
            transcription: response.text,
            detected_questions: [],
            diagram_tags: [],
            uncertain_words: [],
            has_cross_outs: false,
            confidence: 0.85,
          };
        }

        const rawText = parsed.transcription || "";
        const detectedQuestions: string[] = Array.isArray(parsed.detected_questions)
          ? parsed.detected_questions
          : [];
        const diagramTags: string[] = Array.isArray(parsed.diagram_tags)
          ? parsed.diagram_tags
          : [];
        const uncertainWords: string[] = Array.isArray(parsed.uncertain_words)
          ? parsed.uncertain_words
          : [];

        detectedQuestions.forEach((q) => allDetectedQuestions.add(q));
        const words = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;
        totalWords += words;
        totalDiagrams += diagramTags.length;
        const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.88;
        confidenceSum += confidence;

        processedPages.push({
          page_number: page.pageNumber,
          raw_text: rawText,
          detected_questions: detectedQuestions,
          diagram_tags: diagramTags,
          uncertain_words: uncertainWords,
          has_cross_outs: Boolean(parsed.has_cross_outs),
          confidence,
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

/** Segments the multi-page transcription into per-question text chunks */
export function segmentTranscriptionByQuestions(
  pages: ScriptPageTranscription[],
  expectedQuestions: string[],
): Record<string, string> {
  const fullText = pages.map((p) => p.raw_text).join("\n\n");
  const result: Record<string, string> = {};

  // For each expected question, isolate student's answer
  for (let i = 0; i < expectedQuestions.length; i++) {
    const qNum = expectedQuestions[i];
    const escaped = qNum.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(?:Question|Q|Part)?\\s*${escaped}\\b`, "i");
    const match = pattern.exec(fullText);

    if (match) {
      const startIdx = match.index;
      // End at next question header if any
      let endIdx = fullText.length;
      for (let j = 0; j < expectedQuestions.length; j++) {
        if (i === j) continue;
        const otherQ = expectedQuestions[j].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const nextMatch = new RegExp(`(?:Question|Q|Part)\\s*${otherQ}\\b`, "i").exec(
          fullText.slice(startIdx + match[0].length),
        );
        if (nextMatch) {
          const candidateEnd = startIdx + match[0].length + nextMatch.index;
          if (candidateEnd < endIdx) {
            endIdx = candidateEnd;
          }
        }
      }
      result[qNum] = fullText.slice(startIdx, endIdx).trim();
    } else {
      // If student wrote out of order or didn't prefix, provide full text fallback
      result[qNum] = fullText.trim();
    }
  }

  return result;
}
