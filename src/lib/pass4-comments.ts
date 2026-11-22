import type { Grading } from "@/lib/examiner/types";
import { stripScoreFractionsFromText } from "@/lib/examiner/types";
import { stripStars } from "@/lib/utils";

export interface Pass4Comment {
  id: string;
  category: "diagram" | "analysis" | "evaluation" | "knowledge";
  title: string;
  badge: string;
  color: "emerald" | "amber" | "rose" | "sky" | "indigo";
  paragraphIndex: number;
  highlightText: string;
  critique: string;
  suggestion: string;
}

/**
 * Pass 4: In-situ diagnostic alignment pass that compares the dual-examiner
 * candidate report against the candidate script, decoding diagram integration
 * and mapping specific weaknesses directly to paragraphs/sentences.
 */
export function generatePass4Comments(
  essayText: string,
  question: string,
  grading: Grading,
  diagramMatches: { title: string; matchText: string }[] = [],
): Pass4Comment[] {
  if (!essayText.trim() || !grading) return [];

  const comments: Pass4Comment[] = [];

  // Split essay into distinct paragraphs
  const rawParagraphs = essayText
    .split(/\n\s*\n/)
    .map((p, idx) => ({ index: idx, text: p.trim() }))
    .filter((p) => p.text.length > 0);

  if (rawParagraphs.length === 0) return [];

  // 1. Pass 4: Decode Diagram Placement & Integration
  if (diagramMatches.length > 0) {
    diagramMatches.forEach((m, idx) => {
      // Find the paragraph index where this diagram was placed
      const paraIdx = rawParagraphs.findIndex((p) => p.text.includes(m.matchText));
      const targetIndex = paraIdx !== -1 ? paraIdx : Math.min(1, rawParagraphs.length - 1);
      const nextPara = rawParagraphs[targetIndex + 1];

      // Check whether subsequent analysis explains this diagram
      const hasDetailedExplanation =
        nextPara &&
        (nextPara.text.toLowerCase().includes("shift") ||
          nextPara.text.toLowerCase().includes("equilibrium") ||
          nextPara.text.toLowerCase().includes("shortage") ||
          nextPara.text.toLowerCase().includes("surplus") ||
          nextPara.text.toLowerCase().includes("deadweight") ||
          nextPara.text.toLowerCase().includes("price") ||
          nextPara.text.toLowerCase().includes("quantity"));

      const missingDiagramNotes = grading.missing_elements?.diagrams || [];
      const hasDiagramIssue =
        missingDiagramNotes.length > 0 ||
        (grading.ao_breakdown?.analysis?.awarded ?? 0) < (grading.ao_breakdown?.analysis?.out_of ?? 6) ||
        !hasDetailedExplanation;

      const critique =
        missingDiagramNotes[0] ||
        (hasDetailedExplanation
          ? `Diagram (${m.title}) is positioned in analytical flow, but ensure equilibrium shifts (e.g. price and quantity coordinates) are explicitly integrated into subsequent analysis.`
          : `Diagram (${m.title}) is placed here, but the immediate following paragraph lacks explicit discussion of the diagram's curves, shifts, and market equilibrium changes.`);

      const suggestion =
        grading.actionable_feedback?.find((f) => /diagram|figure|curve|shift/i.test(f)) ||
        "Explicitly connect the curves shown on the diagram to the market transmission mechanism in the accompanying text to secure full Level 3 AO2 marks.";

      comments.push({
        id: `pass4-diagram-${idx}`,
        category: "diagram",
        title: `Diagram Decoding: ${m.title}`,
        badge: "Diagram Integration",
        color: "emerald",
        paragraphIndex: targetIndex,
        highlightText: m.matchText,
        critique: stripScoreFractionsFromText(stripStars(critique)),
        suggestion: stripScoreFractionsFromText(stripStars(suggestion)),
      });
    });
  } else {
    // If no diagram was included at all, highlight where a diagram should be integrated
    const analysisParaIdx = Math.min(1, rawParagraphs.length - 1);
    const paraText = rawParagraphs[analysisParaIdx]?.text || "";
    const firstSentence = paraText.split(/[.!?]\s+/)[0] || paraText.slice(0, 80);

    comments.push({
      id: "pass4-diagram-missing",
      category: "diagram",
      title: "Diagram Decoding: Visual Model Omission",
      badge: "Diagram Gap",
      color: "amber",
      paragraphIndex: analysisParaIdx,
      highlightText: firstSentence,
      critique:
        "No economics diagram was detected in the candidate script. Cambridge 9708 examiners reward diagrammatic analysis under AO2 for market mechanisms.",
      suggestion:
        "Position an economics diagram directly after this paragraph to visually illustrate shifts in market equilibrium and gain Level 3 AO2 credit.",
    });
  }

  // 2. Pass 4: Map AO2 Causal Analysis Weaknesses
  const analysisWeakness =
    grading.weaknesses?.find((w) => /analysis|causal|mechanism|chain|transmission|link/i.test(w)) ||
    grading.missing_elements?.analysis?.[0];

  if (analysisWeakness) {
    // Identify best matching analytical paragraph (usually paragraph 1 or 2, containing economic reasoning)
    let bestParaIdx = 1;
    for (let i = 0; i < rawParagraphs.length; i++) {
      const t = rawParagraphs[i].text.toLowerCase();
      if (
        i !== 0 &&
        i !== rawParagraphs.length - 1 &&
        (t.includes("because") ||
          t.includes("leads to") ||
          t.includes("consequently") ||
          t.includes("shifts") ||
          t.includes("demand") ||
          t.includes("supply"))
      ) {
        bestParaIdx = i;
        break;
      }
    }
    bestParaIdx = Math.min(bestParaIdx, rawParagraphs.length - 1);
    const paraText = rawParagraphs[bestParaIdx]?.text || "";
    const firstSentence = paraText.split(/[.!?]\s+/)[0] || paraText.slice(0, 90);

    comments.push({
      id: "pass4-analysis-gap",
      category: "analysis",
      title: "AO2 Causal Analysis: Mechanism Transmission",
      badge: "Analysis Gap",
      color: "amber",
      paragraphIndex: bestParaIdx,
      highlightText: firstSentence,
      critique: stripScoreFractionsFromText(stripStars(analysisWeakness)),
      suggestion:
        grading.actionable_feedback?.find((f) => /chain|reasoning|transmission|mechanism/i.test(f)) ||
        "State every intermediate link in your economic chain: explain the shock, transmission through prices, and final market outcome.",
    });
  }

  // 3. Pass 4: Map AO3 Critical Evaluation Weaknesses
  const evalWeakness =
    grading.weaknesses?.find((w) => /evaluat|conclusion|judgement|balance|depend|criterion|short run/i.test(w)) ||
    grading.missing_elements?.evaluation?.[0] ||
    (grading.ao_breakdown?.evaluation?.out_of && grading.ao_breakdown.evaluation.out_of > 0
      ? grading.ao_breakdown.evaluation.comment
      : null);

  if (evalWeakness && rawParagraphs.length >= 2) {
    // Identify evaluative paragraph (starts with however, on the other hand, in conclusion, or last paragraph)
    let evalParaIdx = rawParagraphs.length - 1;
    for (let i = 0; i < rawParagraphs.length; i++) {
      const t = rawParagraphs[i].text.toLowerCase();
      if (
        t.startsWith("however") ||
        t.startsWith("on the other hand") ||
        t.startsWith("in conclusion") ||
        t.startsWith("overall") ||
        t.includes("depends on")
      ) {
        evalParaIdx = i;
        break;
      }
    }
    const paraText = rawParagraphs[evalParaIdx]?.text || "";
    const firstSentence = paraText.split(/[.!?]\s+/)[0] || paraText.slice(0, 90);

    comments.push({
      id: "pass4-eval-gap",
      category: "evaluation",
      title: "AO3 Critical Evaluation: Depth & Weighing",
      badge: "Evaluation Gap",
      color: "sky",
      paragraphIndex: evalParaIdx,
      highlightText: firstSentence,
      critique: stripScoreFractionsFromText(stripStars(evalWeakness)),
      suggestion:
        grading.actionable_feedback?.find((f) => /evaluat|weigh|criterion|conclusion/i.test(f)) ||
        "Explicitly weigh competing viewpoints against a defined economic criterion (e.g. time frame, PED elasticity, magnitude) before writing your final verdict.",
    });
  }

  // 4. Pass 4: Map AO1 Knowledge / Terminology Gaps (if any)
  const knowledgeWeakness =
    grading.weaknesses?.find((w) => /definition|terminology|knowledge|precise|concept/i.test(w)) ||
    grading.missing_elements?.definitions?.[0];

  if (knowledgeWeakness) {
    const paraText = rawParagraphs[0]?.text || "";
    const firstSentence = paraText.split(/[.!?]\s+/)[0] || paraText.slice(0, 90);

    comments.push({
      id: "pass4-knowledge-gap",
      category: "knowledge",
      title: "AO1 Knowledge: Conceptual Precision",
      badge: "Terminology Gap",
      color: "indigo",
      paragraphIndex: 0,
      highlightText: firstSentence,
      critique: stripScoreFractionsFromText(stripStars(knowledgeWeakness)),
      suggestion:
        "Provide formal textbook definitions for all key economic variables in your opening framing to establish full AO1 credit.",
    });
  }

  return comments;
}
