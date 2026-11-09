import type {
  EconomicArgument,
  MarkLedgerEntry,
  QuestionRubric,
  SemanticClassification,
} from "./types";
import { TARIFF_SPLITS, defaultSplitForMaxMark } from "../examiner/config";
import { stripStars } from "./clean-suggestion";
import { extractQuestionTopicTokens, detectOffTopicConcept } from "./topic-relevance";

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

  // 1b. Question Topic Relevance Guard
  const topicTokens = extractQuestionTopicTokens(rubric.questionText || "");
  const fullEssayText = sentences.map((s) => s.text).join(" ").toLowerCase();
  const hasTopicRelevance =
    topicTokens.length === 0 || topicTokens.some((t) => fullEssayText.includes(t));

  if (!hasTopicRelevance && totalWords >= 20) {
    return {
      arguments: [],
      ledger: [
        {
          argumentId: "arg_off_topic",
          sentenceIds: sentences.map((s) => s.id),
          assessmentObjective: "AO1",
          rubricCriterion: "Question Relevance",
          evidence: sentences[0]?.text?.slice(0, 100) || "",
          awardedCredit: 0,
          missingDevelopment: [
            `The answer does not address the core question prompt (${topicTokens.slice(0, 3).join(", ")}). Cambridge 9708 mark schemes award zero marks for off-topic material.`,
          ],
          status: isAiVerified ? "verified" : "provisional",
          reasoning: "Material is not relevant to the prompt set.",
        },
      ],
      totalMark: 0,
      maxMark,
      status: isAiVerified ? "verified" : "uncertain",
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
    // Incomplete sentences are actively being typed and must not award marks or cause score fluctuations
    if (s.isComplete === false) continue;

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
    const hasApplication = /\b(uk|us|singapore|china|firm|consumer|market|nhs|tax rate|industry|cigarettes|sugar|tobacco|alcohol|petrol|fuel|monopoly|airline|steel|cars?)\b/i.test(combinedText);
    const transmissionChain = combinedText.split(/\b(?:because|therefore|leads to|results in|consequently|shifts?|causes?|increases?|decreases?)\b/i).filter(Boolean);

    let evalDepth: "unsupported" | "partial" | "sustained" | "justified_judgement" = "unsupported";
    if (group.primaryAO === "AO3") {
      const hasEvalCriteria = /\b(elasticity|inelastic|ped|short[- ]run|long[- ]run|magnitude|depends on|opportunity cost|unintended consequences|regressive|efficiency)\b/i.test(combinedText);
      const hasJudgement = /\b(on balance|in conclusion|overall|weighing|ultimately|decisive|most effective|greater impact)\b/i.test(combinedText);
      if (hasJudgement && hasEvalCriteria) {
        evalDepth = "justified_judgement";
      } else if (hasEvalCriteria) {
        evalDepth = "sustained";
      } else {
        evalDepth = "partial";
      }
    }

    return {
      argumentId: `arg::${group.sentenceIds[0]}`,
      sentenceIds: group.sentenceIds,
      claim: combinedText.slice(0, 140),
      primaryAO: group.primaryAO,
      transmissionChain: transmissionChain.map((s) => s.trim()).filter((s) => s.length > 5),
      isCompleteChain: transmissionChain.length >= 2,
      hasContextualApplication: hasApplication,
      evaluativeDepth: evalDepth,
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
      const claimLower = arg.claim.toLowerCase();
      const qLower = (rubric.questionText || "").toLowerCase();

      // Check for off-topic syllabus concept substitutions
      const offTopicResult = detectOffTopicConcept(arg.claim, rubric.questionText || "");
      const isOffTopicDefinition = offTopicResult.isOffTopic;

      const relatesToTopic =
        !isOffTopicDefinition &&
        (topicTokens.length === 0 || topicTokens.some((t) => claimLower.includes(t)));

      if (isDuplicate) {
        missingDevelopment.push("Repeated concept definition; duplicate credit prevented under Cambridge mark scheme.");
      } else if (!relatesToTopic) {
        missingDevelopment.push("Defined an economic concept not required by the question prompt. Off-topic definitions earn 0 marks.");
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
          : !relatesToTopic
            ? "Concept definition is not relevant to the question topic."
            : "Accurate specification definition credited toward syllabus knowledge.",
      });
    } else if (arg.primaryAO === "AO2") {
      const isCompleteAndApplied = arg.isCompleteChain && arg.hasContextualApplication;
      if (isDuplicate) {
        missingDevelopment.push("Repeated analytical mechanism without new intermediate causal steps.");
      } else if (ao2MarksAwarded < split.ao2_marks) {
        // Strict Cambridge 9708: 2 marks requires complete transmission chain + authentic application.
        // Incomplete assertions or unapplied links earn 1 mark (or 0 if prior analysis already exists).
        credit = isCompleteAndApplied ? 2 : arg.isCompleteChain ? 1 : (ao2MarksAwarded === 0 ? 1 : 0);
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
        reasoning: isCompleteAndApplied
          ? "Multi-step cause-and-effect transmission chain with contextual application demonstrated."
          : arg.isCompleteChain
            ? "Analytical transmission demonstrated without specific context."
            : "Analytical statement with room for intermediate mechanism development.",
      });
    } else if (arg.primaryAO === "AO3") {
      if (isDuplicate) {
        missingDevelopment.push("Repeated evaluative point without new criteria or trade-off weighing.");
      } else if (ao3MarksAwarded < split.ao3_marks) {
        // Strict Cambridge 9708: 2 marks for justified judgement; 1 mark for sustained economic criteria; 0 for superficial contrast
        credit = arg.evaluativeDepth === "justified_judgement" ? 2 : (arg.evaluativeDepth === "sustained" ? 1 : 0);
        if (arg.evaluativeDepth === "partial" || arg.evaluativeDepth === "unsupported") {
          missingDevelopment.push("Superficial evaluation: justify your evaluation using economic criteria (e.g. elasticity, time lags, or opportunity cost).");
        }
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
        reasoning: arg.evaluativeDepth === "justified_judgement"
          ? "Supported final judgement weighing competing arguments using economic criteria."
          : arg.evaluativeDepth === "sustained"
            ? "Critical consideration of economic limitations, conditions, or trade-offs."
            : "Superficial evaluation lacking economic justification.",
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
