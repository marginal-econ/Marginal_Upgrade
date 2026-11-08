import type {
  EconomicArgument,
  MarkLedgerEntry,
  QuestionRubric,
  SemanticClassification,
} from "./types";
import { TARIFF_SPLITS, defaultSplitForMaxMark } from "../examiner/config";
import { stripStars } from "./clean-suggestion";

export type BuildLedgerResult = {
  arguments: EconomicArgument[];
  ledger: MarkLedgerEntry[];
  totalMark: number;
  maxMark: number;
  status: "provisional" | "verified" | "uncertain" | "complete";
  markRange?: [number, number];
  aoBreakdown: {
    ao1: { awarded: number; max: number; coveragePct: number };
    ao2: { awarded: number; max: number; coveragePct: number };
    ao3: { awarded: number; max: number; coveragePct: number };
  };
};

/**
 * Normalises text to detect conceptual duplicates and prevent false repeated credit.
 */
function normalizeArgumentClaim(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\b(the|a|an|is|are|defined|as|when|in|on|of|to|that|it)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Groups classified sentences into coherent economic arguments and evaluates them against the Question Rubric.
 */
export function buildMarkLedger(params: {
  sentences: { id: string; text: string; paragraphIndex: number; isComplete: boolean }[];
  classifications: SemanticClassification[];
  rubric: QuestionRubric;
  isAiVerified?: boolean;
}): BuildLedgerResult {
  const { sentences, classifications, rubric, isAiVerified = false } = params;
  const maxMark = (rubric.maximumMarks === 8 || rubric.maximumMarks === 12 || rubric.maximumMarks === 20 ? rubric.maximumMarks : 12) as 8 | 12 | 20;
  const split = TARIFF_SPLITS[maxMark] || defaultSplitForMaxMark(maxMark);

  const totalWords = sentences.reduce(
    (acc, s) => acc + s.text.trim().split(/\s+/).filter(Boolean).length,
    0,
  );

  // 1. Fragment or Insufficient text guard (< 10 words)
  if (totalWords < 10) {
    return {
      arguments: [],
      ledger: [],
      totalMark: 0,
      maxMark,
      status: "uncertain",
      markRange: [0, 0],
      aoBreakdown: {
        ao1: { awarded: 0, max: split.ao1_marks, coveragePct: 0 },
        ao2: { awarded: 0, max: split.ao2_marks, coveragePct: 0 },
        ao3: { awarded: 0, max: split.ao3_marks, coveragePct: 0 },
      },
    };
  }

  // Map classification by sentenceId
  const classMap = new Map(classifications.map((c) => [c.sentenceId, c]));

  // 2. Group sentences into arguments by paragraph and AO continuity
  const argumentsList: EconomicArgument[] = [];
  let currentGroup: {
    sentenceIds: string[];
    texts: string[];
    primaryAO: "AO1" | "AO2" | "AO3" | "NO_CREDIT";
    paragraphIndex: number;
  } | null = null;

  for (const s of sentences) {
    const classification = classMap.get(s.id);
    const ao = classification && classification.primaryAO !== "UNCERTAIN" ? classification.primaryAO : "NO_CREDIT";

    if (
      currentGroup &&
      currentGroup.paragraphIndex === s.paragraphIndex &&
      currentGroup.primaryAO === ao &&
      currentGroup.sentenceIds.length < 3
    ) {
      // Continue existing argument chain
      currentGroup.sentenceIds.push(s.id);
      currentGroup.texts.push(s.text);
    } else {
      if (currentGroup && currentGroup.primaryAO !== "NO_CREDIT") {
        argumentsList.push(createArgument(currentGroup));
      }
      currentGroup = {
        sentenceIds: [s.id],
        texts: [s.text],
        primaryAO: ao,
        paragraphIndex: s.paragraphIndex,
      };
    }
  }

  if (currentGroup && currentGroup.primaryAO !== "NO_CREDIT") {
    argumentsList.push(createArgument(currentGroup));
  }

  function createArgument(group: {
    sentenceIds: string[];
    texts: string[];
    primaryAO: "AO1" | "AO2" | "AO3" | "NO_CREDIT";
  }): EconomicArgument {
    const combinedText = group.texts.join(" ");
    const hasApplication = /\b(uk|us|singapore|china|firm|consumer|market|nhs|tax rate|industry)\b/i.test(combinedText);
    const transmissionChain = combinedText.split(/\b(?:because|therefore|leads to|results in|consequently)\b/i).filter(Boolean);

    return {
      argumentId: `arg::${group.sentenceIds[0]}`,
      sentenceIds: group.sentenceIds,
      claim: combinedText.slice(0, 140),
      primaryAO: group.primaryAO,
      transmissionChain: transmissionChain.map((s) => s.trim()).filter((s) => s.length > 5),
      isCompleteChain: transmissionChain.length >= 2,
      hasContextualApplication: hasApplication,
      evaluativeDepth: group.primaryAO === "AO3" ? "sustained" : undefined,
    };
  }

  // 3. Build Evidence-based Ledger with Anti-Duplication Protection
  const ledger: MarkLedgerEntry[] = [];
  const seenClaimHashes = new Set<string>();

  let ao1MarksAwarded = 0;
  let ao2MarksAwarded = 0;
  let ao3MarksAwarded = 0;

  for (const arg of argumentsList) {
    if (arg.primaryAO === "NO_CREDIT") continue;

    // Check for repetitive/duplicate arguments
    const claimHash = normalizeArgumentClaim(arg.claim);
    const isDuplicate = seenClaimHashes.has(claimHash);
    seenClaimHashes.add(claimHash);

    const missingDevelopment: string[] = [];
    let credit = 0;

    if (arg.primaryAO === "AO1") {
      if (isDuplicate) {
        missingDevelopment.push("Repeated concept definition; duplicate credit prevented under Cambridge mark scheme.");
      } else if (ao1MarksAwarded < split.ao1_marks) {
        credit = 1;
        ao1MarksAwarded += 1;
      }
      ledger.push({
        argumentId: arg.argumentId,
        sentenceIds: arg.sentenceIds,
        assessmentObjective: "AO1",
        rubricCriterion: `Knowledge & understanding of key syllabus concepts (max ${split.ao1_marks}m)`,
        evidence: stripStars(arg.claim),
        awardedCredit: credit,
        missingDevelopment,
        status: isAiVerified ? "verified" : "provisional",
        reasoning: isDuplicate
          ? "Duplicate definition of previously established economic concept."
          : "Accurate specification definition credited toward syllabus knowledge.",
      });
    } else if (arg.primaryAO === "AO2") {
      if (isDuplicate) {
        missingDevelopment.push("Repeated analytical mechanism without new intermediate causal steps.");
      } else if (ao2MarksAwarded < split.ao2_marks) {
        credit = arg.isCompleteChain ? 2 : 1;
        if (!arg.isCompleteChain) {
          missingDevelopment.push("Incomplete causal chain: explain intermediate market/cost adjustments before final outcome.");
        }
        if (!arg.hasContextualApplication) {
          missingDevelopment.push("Lacks contextual application to specific market or economy.");
        }
        credit = Math.min(credit, split.ao2_marks - ao2MarksAwarded);
        ao2MarksAwarded += credit;
      }
      ledger.push({
        argumentId: arg.argumentId,
        sentenceIds: arg.sentenceIds,
        assessmentObjective: "AO2",
        rubricCriterion: `Analytical transmission and application (max ${split.ao2_marks}m)`,
        evidence: stripStars(arg.claim),
        awardedCredit: credit,
        missingDevelopment,
        status: isAiVerified ? "verified" : "provisional",
        reasoning: arg.isCompleteChain
          ? "Multi-step cause-and-effect transmission chain demonstrated."
          : "Analytical statement with room for intermediate mechanism development.",
      });
    } else if (arg.primaryAO === "AO3") {
      if (isDuplicate) {
        missingDevelopment.push("Repeated evaluative point without new criteria or trade-off weighing.");
      } else if (ao3MarksAwarded < split.ao3_marks) {
        credit = arg.evaluativeDepth === "justified_judgement" ? 2 : 1;
        credit = Math.min(credit, split.ao3_marks - ao3MarksAwarded);
        ao3MarksAwarded += credit;
      }
      ledger.push({
        argumentId: arg.argumentId,
        sentenceIds: arg.sentenceIds,
        assessmentObjective: "AO3",
        rubricCriterion: `Critical evaluation and supported judgement (max ${split.ao3_marks}m)`,
        evidence: stripStars(arg.claim),
        awardedCredit: credit,
        missingDevelopment,
        status: isAiVerified ? "verified" : "provisional",
        reasoning: "Critical consideration of economic limitations, conditions, or trade-offs.",
      });
    }
  }

  // 4. Strict Tariff Reconciliation
  ao1MarksAwarded = Math.min(split.ao1_marks, Math.max(0, ao1MarksAwarded));
  ao2MarksAwarded = Math.min(split.ao2_marks, Math.max(0, ao2MarksAwarded));
  ao3MarksAwarded = Math.min(split.ao3_marks, Math.max(0, ao3MarksAwarded));

  const totalMark = ao1MarksAwarded + ao2MarksAwarded + ao3MarksAwarded;
  const status: "provisional" | "verified" | "uncertain" | "complete" =
    totalWords < 40 ? "uncertain" : isAiVerified ? "verified" : "provisional";

  const markRange: [number, number] = [
    Math.max(0, totalMark - (isAiVerified ? 1 : 2)),
    Math.min(maxMark, totalMark + (isAiVerified ? 1 : 2)),
  ];

  return {
    arguments: argumentsList,
    ledger,
    totalMark,
    maxMark,
    status,
    markRange,
    aoBreakdown: {
      ao1: {
        awarded: ao1MarksAwarded,
        max: split.ao1_marks,
        coveragePct: split.ao1_marks > 0 ? Math.round((ao1MarksAwarded / split.ao1_marks) * 100) : 100,
      },
      ao2: {
        awarded: ao2MarksAwarded,
        max: split.ao2_marks,
        coveragePct: split.ao2_marks > 0 ? Math.round((ao2MarksAwarded / split.ao2_marks) * 100) : 100,
      },
      ao3: {
        awarded: ao3MarksAwarded,
        max: split.ao3_marks,
        coveragePct: split.ao3_marks > 0 ? Math.round((ao3MarksAwarded / split.ao3_marks) * 100) : 100,
      },
    },
  };
}
