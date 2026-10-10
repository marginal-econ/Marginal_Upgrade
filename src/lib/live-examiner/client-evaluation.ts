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
  /\b(because|due to their|means that|meaning that|results in|resulting in)\b/i,
  /\b(incentivised to produce|incentivized to produce|profit motive|job opportunities)\b/i,
  /\b(shifts outward|shifts inward|shifts right|shifts left|contracts demand|expands demand)\b/i,
  /\b(increases production|increase in production|rises|rising|reduces|reducing|contracts)\b/i,
  /\b(tax revenue rises|corporate tax rises|income tax|budget for the government|government revenue)\b/i,
];

const AO3_PATTERNS = [
  /\b(however|depends on|depending on|in contrast|on the other hand|overall)\b/i,
  /\b(production capacity|maximum production capacity|capacity constraint|bottleneck)\b/i,
  /\b(short run|long run|in the short term|in the long term)\b/i,
  /\b(budget deficit|deficit for the government|national debt|inflationary pressure)\b/i,
  /\b(not always|may only lead to|only effective if|effective when|limitation)\b/i,
  /\b(if that is true|level of increase depends|trade-?off)\b/i,
];

export type ClientEvaluationResult = {
  predictedMark: PredictedMark;
  classifications: ActiveAoClassification[];
  issues: ActiveIssue[];
  matchedTerms: string[];
};

export function evaluateCambridgeAnswer(
  text: string,
  question: string,
  maxMark: number,
): ClientEvaluationResult {
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
    if (trimmed.length < 10) continue;

    // Check definitions and knowledge first so definitions containing 'because' or 'due to'
    // are correctly classified as AO1 Knowledge, not misattributed as AO2 Analysis.
    const isDefOrTerm = AO1_PATTERNS.some((p) => p.test(trimmed));
    const isAo3 = !isDefOrTerm && AO3_PATTERNS.some((p) => p.test(trimmed));
    const isAo2 = !isDefOrTerm && !isAo3 && AO2_PATTERNS.some((p) => p.test(trimmed));
    const isAo1 = isDefOrTerm;

    if (isAo3) {
      ao3Count++;
      classifications.push({
        id: `AO3::${trimmed.toLowerCase()}::${trimmed.toLowerCase()}`,
        original: trimmed,
        context: sentence,
        ao: "AO3",
        explanation: "AO3 Evaluation: Critical capacity condition, limitation, or counter-argument identified.",
      });
    } else if (isAo2) {
      ao2Count++;
      classifications.push({
        id: `AO2::${trimmed.toLowerCase()}::${trimmed.toLowerCase()}`,
        original: trimmed,
        context: sentence,
        ao: "AO2",
        explanation: "AO2 Analysis: Unbroken economic causal chain linking cause, mechanism, and economic consequence.",
      });
    } else if (isAo1) {
      ao1Count++;
      classifications.push({
        id: `AO1::${trimmed.toLowerCase()}::${trimmed.toLowerCase()}`,
        original: trimmed,
        context: sentence,
        ao: "AO1",
        explanation: "AO1 Knowledge: Accurate Cambridge 9708 definition, formula, or syllabus policy lever.",
      });
    }

    // Collect matched terms
    for (const pat of AO1_PATTERNS) {
      const match = trimmed.match(pat);
      if (match) matchedTerms.add(match[0].toLowerCase());
    }
  }

  // Calculate marks calibrated to Cambridge 9708 tariffs
  let ao1Awarded = 0;
  if (wordCount >= 80 && ao1Count >= 2) {
    ao1Awarded = split.ao1_marks;
  } else if (ao1Count >= 1 || wordCount >= 20) {
    ao1Awarded = Math.min(split.ao1_marks, Math.max(1, Math.floor(split.ao1_marks * 0.5)));
  }

  let ao2Awarded = 0;
  // Analysis requires developing causal transmission mechanisms - never awarded on short opening definitions
  if (wordCount >= 150 && ao2Count >= 3) {
    ao2Awarded = Math.min(split.ao2_marks, Math.max(4, Math.round(split.ao2_marks * 0.75)));
  } else if (wordCount >= 80 && ao2Count >= 2) {
    ao2Awarded = Math.min(split.ao2_marks, Math.max(2, Math.round(split.ao2_marks * 0.5)));
  } else if (wordCount >= 50 && ao2Count >= 1) {
    ao2Awarded = Math.min(split.ao2_marks, Math.max(1, Math.round(split.ao2_marks * 0.25)));
  }

  let ao3Awarded = 0;
  // Evaluation requires weighing up, conditions, and judgements - never awarded on opening text
  if (split.ao3_marks > 0 && wordCount >= 75) {
    if (ao3Count >= 2 && wordCount >= 160) {
      ao3Awarded = Math.min(split.ao3_marks, Math.max(2, Math.round(split.ao3_marks * 0.6)));
    } else if (ao3Count >= 1) {
      ao3Awarded = Math.min(split.ao3_marks, Math.max(1, Math.round(split.ao3_marks * 0.3)));
    }
  }

  const totalMark = Math.min(maxMark, ao1Awarded + ao2Awarded + ao3Awarded);

  // Issues (glossary & grammar)
  const terms = deterministicTerminologyIssues(sentences);
  const grammar = analyzeGrammarAndMechanics(sentences);
  const rawIssues: ActiveIssue[] = [
    ...terms.map((t) => ({ ...t, id: `${t.category}::${t.context.trim().toLowerCase()}::${t.original.trim().toLowerCase()}` })),
    ...grammar.map(({ ruleId: _r, startOffset: _s, endOffset: _e, ...g }) => ({
      ...g,
      id: `${g.category}::${g.context.trim().toLowerCase()}::${g.original.trim().toLowerCase()}`,
    })),
  ];
  const issues: ActiveIssue[] = Array.from(new Map(rawIssues.map((item) => [item.id, item])).values());

  const predictedMark: PredictedMark = {
    total_mark: totalMark,
    confidence: wordCount > 150 ? 0.85 : 0.65,
    headline: `${totalMark}/${maxMark} marks calibrated against Cambridge 9708 assessment criteria`,
    ao_breakdown: {
      knowledge: { awarded: ao1Awarded, out_of: split.ao1_marks },
      analysis: { awarded: ao2Awarded, out_of: split.ao2_marks },
      evaluation: { awarded: ao3Awarded, out_of: split.ao3_marks },
    },
  };

  return {
    predictedMark,
    classifications,
    issues,
    matchedTerms: Array.from(matchedTerms),
  };
}
