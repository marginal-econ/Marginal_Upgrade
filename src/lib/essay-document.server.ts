import { chat, resolveNvidiaVisionKeys, visionChat, visionChatViaNvidia } from "./ai.server";
import { describeDiagramFromDataUrl } from "./diagrams/describe.server";
import { MODEL_EXTRACT } from "./examiner/config";
import { extractFirstJsonObject } from "./examiner/json";

function extractDiagramTitleFromTag(tag: string, fallbackIndex = 1): string {
  const match = tag.match(/\[DIAGRAM:\s*([^|\]]+)/i);
  const raw = match?.[1]?.trim();
  if (!raw || /^(?:none|blank|unknown)$/i.test(raw)) {
    return `Uploaded Diagram ${fallbackIndex}`;
  }
  return raw.slice(0, 72);
}

export type DocumentImageInput = {
  placeholder: string;
  dataUrl: string;
  sourceKind: "embedded_image" | "pdf_page";
};

export type AnalyzedDocumentDiagram = {
  placeholder: string;
  tag: string | null;
  title: string | null;
};

export type DocumentMetaExtraction = {
  extractedQuestion: string | null;
  extractedMaxMark: 8 | 12 | 20 | null;
  inferredQuestion: boolean;
};

const PDF_PAGE_DIAGRAM_SYSTEM = [
  "You are inspecting a single rendered page from a student's Economics essay PDF.",
  "Your task is to detect whether this page contains an actual economics diagram/graph/chart (such as Supply & Demand, AD/AS, PPF, Monopoly, Lorenz Curve, Externality, Phillips Curve, J-Curve, Tariff/Quota).",
  "",
  "RULES:",
  "- If there IS an economics diagram/graph on this page, describe ONLY the diagram(s) in this exact format:",
  "  [DIAGRAM: <diagram name> | axes: <x-axis / y-axis labels or 'unlabelled'> | curves: <curves & shifts shown> | labels: <equilibrium points, prices, quantities, shaded areas> | accuracy: <short factual note on labels/shift direction>]",
  "- If the page has multiple diagrams, output one [DIAGRAM: ...] tag per line.",
  "- If there is NO economics diagram/graph on this page (e.g. only essay paragraphs, headings, page numbers, or small decorative icons), respond with strictly: NO_DIAGRAM",
].join("\n");

const PDF_PAGE_DIAGRAM_USER =
  "Check this PDF page for any economics diagram. Output either [DIAGRAM: ...] tag(s) or NO_DIAGRAM.";

function parseDiagramTagsFromResponse(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed || /\bNO_DIAGRAM\b/i.test(trimmed)) return [];
  const matches = trimmed.match(/\[DIAGRAM:[^\]]+\]/gi) ?? [];
  return matches.filter((tag) => !/\[DIAGRAM:\s*(?:none|blank|no\s+diagram)/i.test(tag));
}

async function analyzePdfPageForDiagram(dataUrl: string): Promise<string[]> {
  try {
    const nvKeys = await resolveNvidiaVisionKeys();
    if (nvKeys.length > 0) {
      const res = await visionChatViaNvidia({
        systemPrompt: PDF_PAGE_DIAGRAM_SYSTEM,
        prompt: PDF_PAGE_DIAGRAM_USER,
        imageDataUrls: [dataUrl],
        maxCompletionTokens: 600,
        temperature: 0.0,
        enableThinking: false,
        timeoutMs: 22_000,
        keys: nvKeys,
      });
      const tags = parseDiagramTagsFromResponse(res.text);
      if (tags.length > 0 || /\bNO_DIAGRAM\b/i.test(res.text)) {
        return tags;
      }
    }
  } catch (err) {
    console.warn("[essay-document] NVIDIA PDF page diagram check fell back:", err);
  }

  try {
    const fallback = await visionChat({
      model: MODEL_EXTRACT,
      systemPrompt: PDF_PAGE_DIAGRAM_SYSTEM,
      prompt: PDF_PAGE_DIAGRAM_USER,
      imageDataUrls: [dataUrl],
      maxCompletionTokens: 600,
    });
    return parseDiagramTagsFromResponse(fallback.text);
  } catch {
    return [];
  }
}

export async function analyzeUploadedImage(
  img: DocumentImageInput,
  fallbackIndex: number,
): Promise<AnalyzedDocumentDiagram> {
  if (img.sourceKind === "embedded_image") {
    try {
      const tag = await describeDiagramFromDataUrl(img.dataUrl);
      if (!tag || /\[DIAGRAM:\s*(?:none|blank|no\s+diagram)/i.test(tag)) {
        return { placeholder: img.placeholder, tag: null, title: null };
      }
      return {
        placeholder: img.placeholder,
        tag,
        title: extractDiagramTitleFromTag(tag, fallbackIndex),
      };
    } catch {
      return { placeholder: img.placeholder, tag: null, title: null };
    }
  }

  const tags = await analyzePdfPageForDiagram(img.dataUrl);
  if (tags.length === 0) {
    return { placeholder: img.placeholder, tag: null, title: null };
  }
  const combinedTag = tags.join("\n");
  return {
    placeholder: img.placeholder,
    tag: combinedTag,
    title: extractDiagramTitleFromTag(tags[0]!, fallbackIndex),
  };
}

export async function extractDocumentQuestionAndTariff(
  textExcerpt: string,
  userId?: string,
): Promise<DocumentMetaExtraction> {
  const snippet = textExcerpt.trim().slice(0, 2800);
  if (snippet.length < 30) {
    return { extractedQuestion: null, extractedMaxMark: null, inferredQuestion: false };
  }

  try {
    const res = await chat({
      model: MODEL_EXTRACT,
      feature: "extract_essay_document_meta",
      userId,
      json: true,
      temperature: 0.0,
      maxCompletionTokens: 320,
      messages: [
        {
          role: "system",
          content: [
            "You analyze an uploaded Economics essay document.",
            "1. If the document explicitly states an essay question or prompt at the top (e.g. 'Question: ...', 'Discuss whether ...', 'Evaluate ... [12]'), extract it verbatim into `question`, set `inferred` to false, and extract `maxMark` (8, 12, or 20) if indicated.",
            "2. If NO question is explicitly written in the document, infer the closest Cambridge 9708 Economics essay question that the essay is clearly answering (e.g. 'Discuss whether a maximum price is effective in improving housing affordability.'), set `inferred` to true, and estimate `maxMark` (8, 12, or 20) based on whether the essay is short descriptive (8), standard evaluative (12), or long multi-policy synoptic (20).",
            "Output ONLY JSON: { \"question\": string | null, \"maxMark\": 8 | 12 | 20 | null, \"inferred\": boolean }",
          ].join("\n"),
        },
        {
          role: "user",
          content: snippet,
        },
      ],
    });

    const parsed = extractFirstJsonObject(res.text) as {
      question?: unknown;
      maxMark?: unknown;
      inferred?: unknown;
    } | null;

    const q =
      typeof parsed?.question === "string" && parsed.question.trim().length >= 10
        ? parsed.question.trim().slice(0, 1500)
        : null;
    const rawMark = Number(parsed?.maxMark);
    const maxMark = rawMark === 8 || rawMark === 12 || rawMark === 20 ? rawMark : null;

    return {
      extractedQuestion: q,
      extractedMaxMark: maxMark,
      inferredQuestion: Boolean(parsed?.inferred),
    };
  } catch {
    return { extractedQuestion: null, extractedMaxMark: null, inferredQuestion: false };
  }
}
