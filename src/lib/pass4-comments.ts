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
  paragraphLabel?: string;
  highlightText: string;
  critique: string;
  suggestion: string;
}

/**
 * Diagnostic guidance tailored specifically to Cambridge 9708 syllabus diagrams.
 * Prevents generic supply/demand "price and quantity coordinates" from being applied to time-path models like the J-Curve.
 */
function getDiagramSyllabusGuidance(
  title: string,
  isFullMarks: boolean,
  hasExplanation: boolean,
): { critique: string; suggestion: string } {
  const lowerTitle = title.toLowerCase();

  // 1. The J-Curve Effect / Marshall-Lerner
  if (/j[\s-_]*curve/i.test(lowerTitle)) {
    if (isFullMarks) {
      return {
        critique: `Diagram (${title}) is accurately positioned in analytical flow, illustrating the time-path trajectory of the current account balance ($X - M$) following currency depreciation.`,
        suggestion: `Full marks secured. For academic distinction: consider acknowledging how non-tariff contracts, exchange rate pass-through elasticity, or domestic spare capacity influence the length of the short-run contractual lag before Marshall-Lerner holds.`,
      };
    }
    return {
      critique: hasExplanation
        ? `Diagram (${title}) is positioned in analytical flow. Ensure the time path (short-run deficit worsening where PEDx + PEDm < 1 due to contractual lags vs long-run surplus recovery where PEDx + PEDm > 1) is explicitly integrated with the current account balance on the vertical axis.`
        : `Diagram (${title}) is placed here, but subsequent analysis lacks explicit reference to the time-path mechanism: why trade balance (X - M) initially worsens before volume adjustments turn it into a surplus under the Marshall-Lerner condition.`,
      suggestion: `Explicitly reference the axes: plot Current Account Balance on the vertical y-axis against Time on the horizontal x-axis, and state the Marshall-Lerner condition (PEDx + PEDm > 1) to explain the recovery leg.`,
    };
  }

  // 2. Macroeconomic AD/AS (Aggregate Demand / Aggregate Supply)
  if (/ad[\s/-]*as|aggregate\s+demand|aggregate\s+supply/i.test(lowerTitle)) {
    if (isFullMarks) {
      return {
        critique: `Diagram (${title}) is accurately integrated into the macroeconomic flow, illustrating shifts in aggregate demand/supply.`,
        suggestion: `Full marks secured. For academic distinction: distinguish between short-run Keynesian spare capacity versus long-run classical vertical LRAS constraints.`,
      };
    }
    return {
      critique: hasExplanation
        ? `Diagram (${title}) is positioned in analytical flow. Ensure shifts in AD/SRAS are traced directly to changes in the general price level (PL) and real GDP (Y), explicitly identifying any resulting output gap.`
        : `Diagram (${title}) is placed here, but subsequent analysis lacks explicit reference to price level (PL1 to PL2) and real output (Y1 to Y2) coordinates.`,
      suggestion: `Integrate price level coordinates (PL1 to PL2) and real output coordinates (Y1 to Y2) directly into your written analysis to demonstrate transmission to macroeconomic objectives.`,
    };
  }

  // 3. Phillips Curve (Short-Run & Long-Run)
  if (/phillips/i.test(lowerTitle)) {
    if (isFullMarks) {
      return {
        critique: `Diagram (${title}) accurately illustrates the inflation-unemployment trade-off and expectations adjustments.`,
        suggestion: `Full marks secured. For academic distinction: discuss how anchored inflation expectations prevent permanent trade-offs along the SRPC.`,
      };
    }
    return {
      critique: `Diagram (${title}) is positioned here. Ensure movement along SRPC and shifts in LRPC at the Natural Rate of Unemployment (NRU) are connected directly to inflation and unemployment data.`,
      suggestion: `Explicitly reference inflation (%) on the y-axis and unemployment (%) on the x-axis, explaining how expectations shift the SRPC vertically.`,
    };
  }

  // 4. Foreign Exchange Market (Floating Exchange Rate / Currency Market)
  if (/exchange\s*rate|forex|currency\s*market/i.test(lowerTitle)) {
    if (isFullMarks) {
      return {
        critique: `Diagram (${title}) accurately models foreign exchange market equilibrium and currency flows.`,
        suggestion: `Full marks secured. For academic distinction: contrast floating market adjustments with central bank foreign exchange reserve interventions.`,
      };
    }
    return {
      critique: `Diagram (${title}) illustrates forex movements. Ensure the exchange rate price coordinates (e.g. ER1 to ER2) and shifts in currency demand/supply are explicitly connected to hot money or trade flows.`,
      suggestion: `Label the axes accurately (Price of currency on vertical, Quantity on horizontal) and link the shift in currency demand/supply to balance of payments movements.`,
    };
  }

  // 5. Lorenz Curve & Gini Coefficient
  if (/lorenz|gini/i.test(lowerTitle)) {
    if (isFullMarks) {
      return {
        critique: `Diagram (${title}) accurately illustrates income inequality distribution against the line of perfect equality.`,
        suggestion: `Full marks secured. For academic distinction: evaluate the difference between pre-tax Gini coefficients and post-tax/transfer Gini coefficients.`,
      };
    }
    return {
      critique: `Ensure the Lorenz curve's deviation from the 45-degree line of perfect equality is tied directly to the Gini coefficient calculation.`,
      suggestion: `Plot Cumulative % of Population on the x-axis against Cumulative % of Income on the y-axis, explaining how fiscal policy alters the area between the curve and the 45° line.`,
    };
  }

  // 6. Production Possibility Frontier (PPF)
  if (/ppf|production\s*possibility/i.test(lowerTitle)) {
    if (isFullMarks) {
      return {
        critique: `Diagram (${title}) accurately demonstrates opportunity cost and productive capacity.`,
        suggestion: `Full marks secured. For academic distinction: evaluate how investment in capital goods shifts the PPF outward faster in future periods.`,
      };
    }
    return {
      critique: `Ensure trade-offs between capital goods and consumer goods illustrate opportunity cost and economic growth via outward PPF shifts.`,
      suggestion: `Explicitly reference the two output bundles on the axes and explain how shifting production involves increasing opportunity cost.`,
    };
  }

  // 7. General Microeconomic Supply & Demand / Tax / Subsidy / Externality
  if (isFullMarks) {
    return {
      critique: `Diagram (${title}) is accurately integrated with market equilibrium coordinates and welfare areas.`,
      suggestion: `Full marks secured. For academic distinction: consider evaluating price elasticity bounds or incidence distribution between consumers and producers.`,
    };
  }
  return {
    critique: hasExplanation
      ? `Diagram (${title}) is positioned in analytical flow, but ensure equilibrium shifts (price and quantity coordinates: P1 to P2, Q1 to Q2) and welfare areas (deadweight loss or surplus) are explicitly integrated into subsequent analysis.`
      : `Diagram (${title}) is placed here, but the immediate following paragraph lacks explicit discussion of the diagram's curves, shifts, and market equilibrium changes.`,
    suggestion: `Explicitly connect the curves shown on the diagram to the market transmission mechanism in the accompanying text to secure full Level 3 AO2 marks.`,
  };
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

  // Track weakness texts already mapped to prevent duplicate diagnostics across categories
  const usedWeaknessTexts = new Set<string>();

  // Full marks check (12/12, 20/20, 8/8)
  const isFullMarks = (grading.total_mark ?? 0) >= (grading.max_mark ?? 12);

  const isDiagramParagraph = (text: string) =>
    /^\s*\((?:Diagram:\s*)?[^)]+\)\s*$/i.test(text) ||
    diagramMatches.some((m) => text.includes(m.matchText));

  // Compute preceding text paragraphs so diagrams are labeled as inserts, not numbered paragraphs
  const getParagraphLabel = (targetIdx: number) => {
    let precedingTextCount = 0;
    for (let i = 0; i < targetIdx; i++) {
      if (!isDiagramParagraph(rawParagraphs[i].text)) {
        precedingTextCount++;
      }
    }
    const isDiag = isDiagramParagraph(rawParagraphs[targetIdx].text);
    if (isDiag) {
      return precedingTextCount > 0 ? `Diagram (after ¶${precedingTextCount})` : "Diagram (at start)";
    }
    return `¶ Paragraph ${precedingTextCount + 1}`;
  };

  // Helper to sanitize suggestion tone when full marks are achieved
  const formatSuggestion = (rawSuggestion: string, fallback: string) => {
    if (!isFullMarks) return rawSuggestion || fallback;
    let s = rawSuggestion || fallback;
    // Strip deficit-oriented phrases
    s = s.replace(/to push toward full marks[.,]?\s*/gi, "");
    s = s.replace(/to secure full level \d+ (?:ao\d+ )?marks[.,]?\s*/gi, "");
    s = s.replace(/to gain level \d+ (?:ao\d+ )?credit[.,]?\s*/gi, "");
    s = s.replace(/to push into the top band[.,]?\s*/gi, "");
    if (!/full marks secured|exemplar/i.test(s)) {
      s = `Full marks secured. For academic distinction: ${s.charAt(0).toLowerCase() + s.slice(1)}`;
    }
    return s;
  };

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
          nextPara.text.toLowerCase().includes("quantity") ||
          nextPara.text.toLowerCase().includes("marshall") ||
          nextPara.text.toLowerCase().includes("deficit") ||
          nextPara.text.toLowerCase().includes("current account") ||
          nextPara.text.toLowerCase().includes("time"));

      const guidance = getDiagramSyllabusGuidance(m.title, isFullMarks, Boolean(hasDetailedExplanation));

      const missingDiagramNotes = grading.missing_elements?.diagrams || [];
      const critique =
        missingDiagramNotes[0] && !isFullMarks
          ? missingDiagramNotes[0]
          : guidance.critique;

      const rawSuggestion =
        grading.actionable_feedback?.find((f) => /diagram|figure|curve|shift|j[\s-_]*curve/i.test(f)) ||
        guidance.suggestion;

      comments.push({
        id: `pass4-diagram-${idx}`,
        category: "diagram",
        title: isFullMarks ? `Diagram Integration: ${m.title}` : `Diagram Decoding: ${m.title}`,
        badge: isFullMarks ? "Diagram Mastery" : "Diagram Integration",
        color: "emerald",
        paragraphIndex: targetIndex,
        paragraphLabel: getParagraphLabel(targetIndex),
        highlightText: m.matchText,
        critique: stripScoreFractionsFromText(stripStars(critique)),
        suggestion: stripScoreFractionsFromText(stripStars(formatSuggestion(rawSuggestion, guidance.suggestion))),
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
      title: isFullMarks ? "Diagram Integration: Extension Model" : "Diagram Decoding: Visual Model Omission",
      badge: isFullMarks ? "Diagram Extension" : "Diagram Gap",
      color: isFullMarks ? "emerald" : "amber",
      paragraphIndex: analysisParaIdx,
      paragraphLabel: getParagraphLabel(analysisParaIdx),
      highlightText: firstSentence,
      critique: isFullMarks
        ? "No diagram was included in the script. While full marks were achieved through exhaustive textual reasoning, anchoring the response to an economics diagram represents examiner best practice."
        : "No economics diagram was detected in the candidate script. Cambridge 9708 examiners reward diagrammatic analysis under AO2 for market mechanisms.",
      suggestion: isFullMarks
        ? "Full marks secured. For academic distinction: position an economics diagram directly after this paragraph to visually anchor the transmission mechanism."
        : "Position an economics diagram directly after this paragraph to visually illustrate shifts in market equilibrium and gain Level 3 AO2 credit.",
    });
  }

  // 2. Pass 4: Map AO2 Causal Analysis Weaknesses
  const analysisWeakness =
    grading.weaknesses?.find(
      (w) =>
        !usedWeaknessTexts.has(w) &&
        /\b(analysis|causal|mechanism|mechanisms|chain|transmission|transmission\s+link|link|links|multiplier|transmission\s+mechanism)\b/i.test(w),
    ) ||
    grading.missing_elements?.analysis?.find((w) => !usedWeaknessTexts.has(w));

  if (analysisWeakness) {
    usedWeaknessTexts.add(analysisWeakness);

    // Identify best matching analytical paragraph (usually paragraph 1 or 2, containing economic reasoning)
    let bestParaIdx = 1;
    for (let i = 0; i < rawParagraphs.length; i++) {
      if (isDiagramParagraph(rawParagraphs[i].text)) continue;
      const t = rawParagraphs[i].text.toLowerCase();
      if (
        i !== 0 &&
        i !== rawParagraphs.length - 1 &&
        (t.includes("because") ||
          t.includes("leads to") ||
          t.includes("consequently") ||
          t.includes("shifts") ||
          t.includes("demand") ||
          t.includes("supply") ||
          t.includes("depreciation") ||
          t.includes("inflation"))
      ) {
        bestParaIdx = i;
        break;
      }
    }
    bestParaIdx = Math.min(bestParaIdx, rawParagraphs.length - 1);
    const paraText = rawParagraphs[bestParaIdx]?.text || "";
    const firstSentence = paraText.split(/[.!?]\s+/)[0] || paraText.slice(0, 90);

    const rawSuggestion =
      grading.actionable_feedback?.find((f) => /chain|reasoning|transmission|mechanism/i.test(f)) ||
      "State every intermediate link in your economic chain: explain the shock, transmission through prices, and final market outcome.";

    comments.push({
      id: "pass4-analysis-gap",
      category: "analysis",
      title: isFullMarks ? "AO2 Synoptic Analysis: Extension & Edge Cases" : "AO2 Causal Analysis: Mechanism Transmission",
      badge: isFullMarks ? "Extension Tip" : "Analysis Gap",
      color: isFullMarks ? "sky" : "amber",
      paragraphIndex: bestParaIdx,
      paragraphLabel: getParagraphLabel(bestParaIdx),
      highlightText: firstSentence,
      critique: stripScoreFractionsFromText(stripStars(analysisWeakness)),
      suggestion: stripScoreFractionsFromText(stripStars(formatSuggestion(rawSuggestion, "Consider detailing secondary economic feedbacks (e.g. wage pressures or capacity limits)."))),
    });
  }

  // 3. Pass 4: Map AO3 Critical Evaluation Weaknesses
  const evalWeakness =
    grading.weaknesses?.find(
      (w) =>
        !usedWeaknessTexts.has(w) &&
        /\b(evaluat|evaluation|conclusion|judgement|balance|depend|depends|criterion|criteria|short run|elasticity)\b/i.test(w),
    ) ||
    grading.missing_elements?.evaluation?.find((w) => !usedWeaknessTexts.has(w)) ||
    (grading.ao_breakdown?.evaluation?.out_of &&
    grading.ao_breakdown.evaluation.out_of > 0 &&
    (grading.ao_breakdown.evaluation.awarded ?? 0) < grading.ao_breakdown.evaluation.out_of &&
    grading.ao_breakdown.evaluation.comment &&
    !usedWeaknessTexts.has(grading.ao_breakdown.evaluation.comment)
      ? grading.ao_breakdown.evaluation.comment
      : null);

  if (evalWeakness && rawParagraphs.length >= 2) {
    usedWeaknessTexts.add(evalWeakness);

    // Identify evaluative paragraph (starts with however, on the other hand, in conclusion, or last paragraph)
    let evalParaIdx = rawParagraphs.length - 1;
    for (let i = 0; i < rawParagraphs.length; i++) {
      if (isDiagramParagraph(rawParagraphs[i].text)) continue;
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

    const rawSuggestion =
      grading.actionable_feedback?.find((f) => /evaluat|weigh|criterion|conclusion/i.test(f)) ||
      "Explicitly weigh competing viewpoints against a defined economic criterion (e.g. time frame, PED elasticity, magnitude) before writing your final verdict.";

    comments.push({
      id: "pass4-eval-gap",
      category: "evaluation",
      title: isFullMarks ? "AO3 Evaluative Sophistication: Distinction Depth" : "AO3 Critical Evaluation: Depth & Weighing",
      badge: isFullMarks ? "Examiner Note" : "Evaluation Gap",
      color: isFullMarks ? "emerald" : "sky",
      paragraphIndex: evalParaIdx,
      paragraphLabel: getParagraphLabel(evalParaIdx),
      highlightText: firstSentence,
      critique: stripScoreFractionsFromText(stripStars(evalWeakness)),
      suggestion: stripScoreFractionsFromText(stripStars(formatSuggestion(rawSuggestion, "Explicitly weigh competing viewpoints against a defined economic criterion (e.g. time frame or elasticity bounds)."))),
    });
  }

  // 4. Pass 4: Map AO1 Knowledge / Terminology Gaps (if any)
  // Suppress "Terminology Gap" if student secured full AO1 knowledge marks and there are no explicit missing definitions
  const hasKnowledgeGap =
    (grading.ao_breakdown?.knowledge?.awarded ?? 0) < (grading.ao_breakdown?.knowledge?.out_of ?? 2) ||
    (grading.missing_elements?.definitions && grading.missing_elements.definitions.length > 0);

  // Strict regex: must NOT match "acknowledge" as "knowledge"
  const knowledgeWeakness =
    (hasKnowledgeGap || !isFullMarks)
      ? grading.weaknesses?.find((w) => {
          if (usedWeaknessTexts.has(w)) return false;
          // Exclude instances where "acknowledge" is used without actual terminology keywords
          if (/\backnowledg/i.test(w) && !/\b(definition|terminology|formula)\b/i.test(w)) return false;
          return (
            /\b(definition|definitions|terminology|terms|formula|concept|concepts)\b/i.test(w) ||
            /\b(theoretical\s+definition|conceptual\s+precision)\b/i.test(w)
          );
        }) || grading.missing_elements?.definitions?.find((w) => !usedWeaknessTexts.has(w))
      : null;

  if (knowledgeWeakness) {
    usedWeaknessTexts.add(knowledgeWeakness);

    // Locate matching paragraph that actually mentions the concept or default to paragraph 0
    let targetKnowledgeIdx = 0;
    const lowerWeakness = knowledgeWeakness.toLowerCase();
    for (let i = 0; i < rawParagraphs.length; i++) {
      if (isDiagramParagraph(rawParagraphs[i].text)) continue;
      const pText = rawParagraphs[i].text.toLowerCase();
      if (
        (lowerWeakness.includes("exchange rate") && pText.includes("exchange rate")) ||
        (lowerWeakness.includes("inflation") && pText.includes("inflation")) ||
        (lowerWeakness.includes("elasticity") && pText.includes("elasticity")) ||
        (lowerWeakness.includes("balance of payments") && pText.includes("balance of payments"))
      ) {
        targetKnowledgeIdx = i;
        break;
      }
    }

    const paraText = rawParagraphs[targetKnowledgeIdx]?.text || "";
    const firstSentence = paraText.split(/[.!?]\s+/)[0] || paraText.slice(0, 90);

    comments.push({
      id: "pass4-knowledge-gap",
      category: "knowledge",
      title: isFullMarks ? "AO1 Knowledge Extension: Advanced Theoretical Framing" : "AO1 Knowledge: Conceptual Precision",
      badge: isFullMarks ? "Extension Tip" : "Terminology Gap",
      color: "indigo",
      paragraphIndex: targetKnowledgeIdx,
      paragraphLabel: getParagraphLabel(targetKnowledgeIdx),
      highlightText: firstSentence,
      critique: stripScoreFractionsFromText(stripStars(knowledgeWeakness)),
      suggestion: isFullMarks
        ? "Full marks secured. For academic distinction: provide formal mathematical or textbook bounds for all economic variables."
        : "Provide formal textbook definitions for all key economic variables in your opening framing to establish full AO1 credit.",
    });
  }

  return comments;
}
