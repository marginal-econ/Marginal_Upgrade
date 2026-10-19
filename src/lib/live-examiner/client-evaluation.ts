import { defaultSplitForMaxMark } from "@/lib/examiner/config";
import type {
  ActiveAoClassification,
  ActiveIssue,
  PredictedMark,
} from "@/hooks/use-live-examiner-check";
import { deterministicTerminologyIssues } from "./economics-glossary";
import { analyzeGrammarAndMechanics } from "./grammar-engine";
import { splitSentences } from "@/lib/writing-check/sentence-diff";

const AO1_PATTERNS = [
  /\b(aggregate demand|aggregate supply|ad equation|c\s*\+\s*i\s*\+\s*g\s*\+\s*nx|ad\s*=\s*c\s*\+\s*i\s*\+\s*g\s*\+\s*nx)\b/i,
  /\b(monetary policy|fiscal policy|expansionary|contractionary|interest rates?|taxation|money supply)\b/i,
  /\b(inflation|demand-?pull|cost-?push|deflation|disinflation|price level|cpi)\b/i,
  /\b(elasticity|ped|yed|pes|xed|price elastic|inelastic)\b/i,
  /\b(gdp|economic growth|real gdp|output|national income)\b/i,
  /\b(demerit goods?|merit goods?|public goods?|free rider|non-excludable|non-rival)\b/i,
  /\b(external costs?|externalit(?:y|ies|ailties)|social optimum|market failures?|information failures?|information faliure)\b/i,
  /\b(opportunity costs?|production possibility|ppc|ppf)\b/i,
  /\b(equilibrium|price floors?|minimum prices?|maximum prices?|price ceilings?|subsid(?:y|ies)|tariffs?)\b/i,
  /\b(is equal to|is defined as|refers to|means that suppliers|means that firms|are goods that are|government intervention|overconsumed|underconsumed)\b/i,
];

const AO2_PATTERNS = [
  /\b(leads to|leading to|causes|causing|as a result|consequently|therefore)\b/i,
  /\b(because|due to their|means that|meaning that|results in|resulting in|generates?)\b/i,
  /\b(incentivised to produce|incentivized to produce|profit motive|job opportunities)\b/i,
  /\b(shifts outward|shifts inward|shifts right|shifts left|contracts demand|expands demand)\b/i,
  /\b(increases production|increase in production|rises|rising|reduces|reducing|contracts)\b/i,
  /\b(tax revenue rises|corporate tax rises|income tax|budget for the government|government revenue)\b/i,
  /\b(deadweight (?:welfare )?loss|welfare loss|consumer surplus|producer surplus|allocative (?:in)?efficiency|multiplier effect|crowding out|transmission mechanism)\b/i,
];

const AO3_PATTERNS = [
  /\b(but|how+ev+e?r|however|in contrast|by contrast|on the other hand|on the one hand|whereas|nevertheless|nonetheless|conversely|alternatively|despite this|in spite of|on the contrary|notwithstanding|yet|although|even though)\b/i,
  /\b(but\s+(?:this|in|the|it|if|when|whether|there|consumers?|firms?|producers?|governments?|only|may|might|could|creates?|leads?|results?|depends?|is not|are not|cannot))\b/i,
  /\b(depends on|depend on|depending on|depends upon|depending upon|contingent on|contingent upon|is determined by the extent|to the extent that|the extent to which|to what extent|degree to which|critical factor determining|crucial factor|pivotal factor)\b/i,
  /\b(elasticity of demand determines|depends on the elasticity|ped of the good|ped is inelastic|ped is elastic|pes is inelastic|pes is elastic|magnitude of the shift|size of the tax|size of the subsidy|scale of the intervention)\b/i,
  /\b(not fully accurate|merely estimates|assumes? ceteris paribus|ceteris paribus assumption|in reality|temporal validity|past data|data may be outdated|difficult to measure|imperfect information|asymmetric information)\b/i,
  /\b(short run versus long run|short run vs long run|short-run vs long-run|in the short run.*in the long run|in the short-?run|in the long-?run|time lag|time lags|over time|takes time to|immediate effect)\b/i,
  /\b(more important than|most critical factor|greater significance|weighing up|overall|in conclusion|to conclude|in summary|to summarise|ultimately|on balance|all things considered|balanced judgement|final judgement|judgement|priority should be|more effective than|the most effective policy)\b/i,
  /\b(not always|only effective if|effective when|ineffective|limitation|limitations|drawbacks?|trade-?off|trade-offs|unintended consequence|unintended consequences|market distortion|government failure|opportunity cost of government)\b/i,
];

export function classifySentenceDeterministically(sentence: string): {
  ao: "AO1" | "AO2" | "AO3";
  explanation: string;
} {
  const trimmed = sentence.trim();
  const lower = trimmed.toLowerCase();

  // 1. Explicit definition phrasing, formulas, and baseline concept definitions (AO1 Knowledge)
  const isExplicitDef =
    /\b(is defined as|is the degree of responsiveness|is a measure of|is the measure of|measures the percentage change|refers to|definition of|occurs when|measures how|is calculated as|is equal to|are goods that are|can be defined as|formula for|is the percentage change|are defined as)\b/i.test(
      lower,
    ) ||
    /^(?:ped|yed|pes|xed|price elasticity|income elasticity|cross elasticity|elasticity of supply|inflation|gdp|cpi|opportunity cost|fiscal policy|monetary policy)\s+(?:is|measures|refers to|represents)\b/i.test(
      lower,
    ) ||
    /\b(demerit goods? are|merit goods? are|public goods? are|free riders? are)\b/i.test(lower);

  if (isExplicitDef) {
    return {
      ao: "AO1",
      explanation: "AO1 Knowledge: Accurate Cambridge 9708 definition, formula, or economic concept foundation.",
    };
  }

  // 2. Evaluative criteria, dependencies, trade-offs, judgements (AO3 Evaluation)
  const isAo3 =
    AO3_PATTERNS.some((p) => p.test(lower)) ||
    /\b(but\b|how+ev+e?r|however|although|on the other hand|nevertheless|in contrast|whereas|conversely|depends on|depends upon|dependent on|critical factor determining|extent to which|contingent upon|time lag|unintended consequence|in conclusion|overall|ultimately|to conclude|judgement|weighing|effective|ineffective|limitation|drawback|trade-?off)\b/i.test(
      lower,
    );
  if (isAo3) {
    return {
      ao: "AO3",
      explanation: "AO3 Evaluation: Critical capacity condition, dependency, limitation, or evaluative judgement.",
    };
  }

  // 3. Analysis, causal mechanisms, transmission links, application (AO2 Analysis)
  const isAo2 =
    AO2_PATTERNS.some((p) => p.test(lower)) ||
    /\b(causes|leading to|leads to|results in|resulting in|generates?|deadweight|welfare loss|distortion|means that|this means|contraction in|expansion in|shift|shifts|excess supply|excess demand|surplus|shortage|as prices? rise|as prices? fall|higher prices?|lower prices?|incentive|disincentive|signals?|rationing|allocative|fall by a|increase by a|percentage|quantity demanded|quantity supplied|constrained|producers?|consumers?|firms?|output|sales?|profit|revenue|maximise|maximize|for example|for instance|such as|case of|toyota|cars)\b/i.test(
      lower,
    );
  if (isAo2) {
    return {
      ao: "AO2",
      explanation: "AO2 Analysis: Causal transmission mechanism linking cause, market reaction, and economic outcome.",
    };
  }

  // 4. Terminology / general knowledge foundation (AO1 Knowledge)
  return {
    ao: "AO1",
    explanation: "AO1 Knowledge: Foundational economic statement, terminology, or theoretical premise.",
  };
}

export type ClientEvaluationResult = {
  predictedMark: PredictedMark;
  classifications: ActiveAoClassification[];
  issues: ActiveIssue[];
  matchedTerms: string[];
};

export function evaluateCambridgeAnswer(
  text: string,
  arg2?: number | string,
  arg3?: number | string,
  _arg4?: string,
): ClientEvaluationResult {
  let maxMark = 12;
  let level = "as";

  if (typeof arg2 === "number") {
    maxMark = arg2;
    if (typeof arg3 === "string") level = arg3;
  } else if (typeof arg3 === "number") {
    maxMark = arg3;
    if (typeof _arg4 === "string") level = _arg4;
  } else if (typeof arg2 === "string" && !isNaN(Number(arg2))) {
    maxMark = Number(arg2);
    if (typeof arg3 === "string") level = arg3;
  }

  // Guard against non-numeric or non-finite values
  maxMark = Number.isFinite(maxMark) && maxMark > 0 ? maxMark : 12;
  const sentences = splitSentences(text);
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const split = defaultSplitForMaxMark(maxMark);
  const classifications: ActiveAoClassification[] = [];
  const matchedTerms = new Set<string>();

  let ao1Count = 0;
  let ao2Count = 0;
  let ao3Count = 0;

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length < 5 || /\[DIAGRAM:[^\]]*\]/i.test(trimmed)) continue;

    const classified = classifySentenceDeterministically(trimmed);
    if (classified.ao === "AO3") {
      ao3Count++;
    } else if (classified.ao === "AO2") {
      ao2Count++;
    } else {
      ao1Count++;
    }

    classifications.push({
      id: `${classified.ao}::${trimmed.toLowerCase()}::${trimmed.toLowerCase()}`,
      original: trimmed,
      context: sentence,
      ao: classified.ao,
      explanation: classified.explanation,
    });

    // Collect matched terms
    for (const pat of AO1_PATTERNS) {
      const match = trimmed.match(pat);
      if (match) matchedTerms.add(match[0].toLowerCase());
    }
  }

  // Calculate marks calibrated to Cambridge 9708 tariffs
  let ao1Awarded = 0;
  if ((wordCount >= 60 && ao1Count >= 1) || ao1Count >= 2) {
    ao1Awarded = split.ao1_marks;
  } else if (ao1Count >= 1 || wordCount >= 20) {
    ao1Awarded = Math.min(split.ao1_marks, Math.max(1, Math.floor(split.ao1_marks * 0.5)));
  }

  let ao2Awarded = 0;
  // Analysis requires developing causal transmission mechanisms
  if (
    (wordCount >= 180 && ao2Count >= 4) ||
    (ao2Count >= 4 && ao3Count >= 2) ||
    (ao2Count >= 3 && ao3Count >= 2) ||
    (ao2Count >= 5)
  ) {
    // Top-band analysis: 5 or 6 out of 6
    ao2Awarded = Math.min(split.ao2_marks, Math.max(5, Math.round(split.ao2_marks * 0.95)));
  } else if ((wordCount >= 120 && ao2Count >= 3) || ao2Count >= 3) {
    ao2Awarded = Math.min(split.ao2_marks, Math.max(4, Math.round(split.ao2_marks * 0.8)));
  } else if (wordCount >= 70 && ao2Count >= 2) {
    ao2Awarded = Math.min(split.ao2_marks, Math.max(3, Math.round(split.ao2_marks * 0.6)));
  } else if (wordCount >= 30 && ao2Count >= 1) {
    ao2Awarded = Math.min(split.ao2_marks, Math.max(1, Math.round(split.ao2_marks * 0.3)));
  }

  let ao3Awarded = 0;
  // Evaluation requires weighing up, conditions, and judgements
  if (split.ao3_marks > 0 && (wordCount >= 50 || ao3Count >= 1)) {
    if ((wordCount >= 150 && ao3Count >= 2) || (ao3Count >= 2 && ao2Count >= 3) || ao3Count >= 3) {
      // Top-band evaluation: full marks or 3/4
      ao3Awarded = split.ao3_marks;
    } else if (ao3Count >= 1 && wordCount >= 100) {
      ao3Awarded = Math.min(split.ao3_marks, Math.max(2, Math.round(split.ao3_marks * 0.65)));
    } else if (ao3Count >= 1) {
      ao3Awarded = Math.min(split.ao3_marks, Math.max(1, Math.round(split.ao3_marks * 0.35)));
    }
  }

  const safeAo1 = Number.isFinite(ao1Awarded) ? Math.min(split.ao1_marks, Math.max(0, ao1Awarded)) : 0;
  const safeAo2 = Number.isFinite(ao2Awarded) ? Math.min(split.ao2_marks, Math.max(0, ao2Awarded)) : 0;
  const safeAo3 = Number.isFinite(ao3Awarded) ? Math.min(split.ao3_marks, Math.max(0, ao3Awarded)) : 0;
  const sumMarks = safeAo1 + safeAo2 + safeAo3;
  const totalMark = Math.min(maxMark, Number.isFinite(sumMarks) ? sumMarks : 0);

  // Issues (glossary & grammar)
  const terms = deterministicTerminologyIssues(sentences);
  const grammar = analyzeGrammarAndMechanics(sentences);
  const rawIssues: ActiveIssue[] = [
    ...terms.map((t) => ({ ...t, id: `${t.category}::${t.original.trim().toLowerCase()}` })),
    ...grammar.map(({ ruleId: _r, startOffset: _s, endOffset: _e, ...g }) => ({
      ...g,
      id: `${g.category}::${g.original.trim().toLowerCase()}`,
    })),
  ];
  const issues: ActiveIssue[] = Array.from(new Map(rawIssues.map((item) => [item.id, item])).values());

  const predictedMark: PredictedMark = {
    total_mark: totalMark,
    confidence: wordCount > 150 ? 0.85 : 0.65,
    headline: `${totalMark}/${maxMark} marks calibrated against Cambridge 9708 assessment criteria`,
    ao_breakdown: {
      knowledge: { awarded: safeAo1, out_of: split.ao1_marks || 2 },
      analysis: { awarded: safeAo2, out_of: split.ao2_marks || 6 },
      evaluation: { awarded: safeAo3, out_of: split.ao3_marks || 4 },
    },
  };

  return {
    predictedMark,
    classifications,
    issues,
    matchedTerms: Array.from(matchedTerms),
  };
}
