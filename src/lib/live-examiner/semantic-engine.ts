import type { SemanticClassification, IssueV2, QuestionRubric } from "./types";
import { classifySentence } from "./sentence-engine";
import { checkEconomicMisconceptions, analyzeCausalChain, evaluateEvaluativeDepth, assessApplicationQuality } from "./reasoning-engine";
import { stripStars } from "./clean-suggestion";

export type SentenceContextInput = {
  id: string;
  text: string;
  paragraphText: string;
  previousSentenceText?: string;
  nextSentenceText?: string;
  paragraphIndex: number;
  sentenceIndex: number;
};

/**
 * Evaluates a single sentence with rich surrounding context to determine its true economic function.
 */
export function evaluateSentenceSemantics(params: {
  sentence: SentenceContextInput;
  docVersion: number;
  rubric: QuestionRubric;
  existingIssues?: IssueV2[];
}): SemanticClassification {
  const { sentence, docVersion, rubric, existingIssues = [] } = params;
  const text = sentence.text.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // 1. Fragments and short incomplete clauses (< 4 words) earn NO_CREDIT
  if (wordCount < 4 || !/[.!?]['"’”\)\]]*$/.test(text)) {
    return {
      sentenceId: sentence.id,
      documentVersion: docVersion,
      primaryAO: "NO_CREDIT",
      secondaryAOs: [],
      confidence: 0.95,
      economicFunction: "Incomplete fragment or note",
      evidence: "",
      issues: existingIssues,
      requiresReview: false,
    };
  }

  // 2. Deterministic Misconceptions & Reasoning Flaws
  const misconceptionIssues = checkEconomicMisconceptions(text, sentence.id);
  const causalResult = analyzeCausalChain(text);
  const evalResult = evaluateEvaluativeDepth(text);
  const appResult = assessApplicationQuality(text);

  const combinedIssues: IssueV2[] = [...existingIssues, ...misconceptionIssues];

  if (appResult.isSuperficial && appResult.feedback) {
    combinedIssues.push({
      id: `superficial_app::${sentence.id}`,
      sentenceId: sentence.id,
      from: 0,
      to: text.length,
      category: "application",
      severity: "medium",
      original: appResult.contextFound || text,
      explanation: appResult.feedback,
      evidence: "Cambridge 9708 Indicative Application Criteria",
      aoImpact: "Capped at Level 2 analysis without specific economic condition details.",
      status: "active",
    });
  }

  // 3. Fallback to existing deterministic classifier for baseline
  const baseline = classifySentence(text);
  let primaryAO: "AO1" | "AO2" | "AO3" | "NO_CREDIT" | "UNCERTAIN" = "NO_CREDIT";
  const secondaryAOs: ("AO1" | "AO2" | "AO3")[] = [];
  let economicFunction = "General descriptive statement";
  let confidence = 0.85;

  // 4. Contextual Decision Matrix
  const isDefinitionPattern =
    /\b(is defined as|refers to|means that|is when|are when|formula for|is a good that|is an expenditure tax|is a subsidy)\b/i.test(text);

  if (isDefinitionPattern || (baseline && baseline.ao === "AO1")) {
    primaryAO = "AO1";
    economicFunction = "Knowledge & concept definition";
    confidence = Math.max(confidence, baseline ? baseline.confidence : 0.88);

    // If a definition also introduces a causal step (e.g. "Free trade refers to... which increases specialization and lowers prices")
    if (causalResult.steps.length > 0) {
      secondaryAOs.push("AO2");
    }
  } else if (evalResult.depth !== "none" || (baseline && baseline.ao === "AO3")) {
    // If the question command word doesn't reward evaluation (e.g. "Explain"), treat as AO2 or note restriction
    if (!rubric.commandWord || rubric.commandWord.toLowerCase() === "explain") {
      primaryAO = "AO2";
      economicFunction = "Analytical contrast (command word 'Explain' does not award AO3)";
      confidence = 0.8;
    } else {
      primaryAO = "AO3";
      economicFunction =
        evalResult.depth === "justified_judgement"
          ? "Supported contextual judgement resolving prompt"
          : evalResult.depth === "sustained"
            ? "Sustained comparative evaluation & trade-off weighing"
            : "Evaluative contrast / conditional qualification";
      confidence = Math.max(confidence, baseline ? baseline.confidence : 0.85);

      if (causalResult.isComplete) {
        secondaryAOs.push("AO2");
      }
    }
  } else if (causalResult.steps.length > 0 || (baseline && baseline.ao === "AO2")) {
    primaryAO = "AO2";
    economicFunction = causalResult.isComplete
      ? "Developed multi-step causal transmission chain"
      : "Analytical linkage (intermediate step required for full mark)";
    confidence = Math.max(confidence, baseline ? baseline.confidence : 0.82);

    if (isDefinitionPattern) {
      secondaryAOs.push("AO1");
    }
  } else if (wordCount >= 10 && /\b(price|cost|firm|market|demand|supply|inflation|tax|gdp|consumer|trade)\b/i.test(text)) {
    // Economically relevant context without strong chain
    primaryAO = "AO1";
    economicFunction = "Factual economic context or background";
    confidence = 0.7;
  }

  return {
    sentenceId: sentence.id,
    documentVersion: docVersion,
    primaryAO,
    secondaryAOs,
    confidence,
    economicFunction,
    evidence: stripStars(text.slice(0, 100)),
    issues: combinedIssues,
    requiresReview: confidence < 0.75,
  };
}

/**
 * Re-evaluates a paragraph of sentences maintaining argument relationships.
 */
export function evaluateParagraphSemantics(params: {
  sentences: { id: string; text: string; paragraphIndex: number; sentenceIndex: number }[];
  paragraphText: string;
  docVersion: number;
  rubric: QuestionRubric;
}): SemanticClassification[] {
  const { sentences, paragraphText, docVersion, rubric } = params;

  return sentences.map((s, idx) => {
    const prev = idx > 0 ? sentences[idx - 1]!.text : undefined;
    const next = idx < sentences.length - 1 ? sentences[idx + 1]!.text : undefined;

    return evaluateSentenceSemantics({
      sentence: {
        id: s.id,
        text: s.text,
        paragraphText,
        previousSentenceText: prev,
        nextSentenceText: next,
        paragraphIndex: s.paragraphIndex,
        sentenceIndex: s.sentenceIndex,
      },
      docVersion,
      rubric,
    });
  });
}
