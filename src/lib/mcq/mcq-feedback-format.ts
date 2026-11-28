import { stripStars } from "../utils";
import type { McqDiagnostic, McqExplanationResult } from "./mcq-pdf.server";
import type { McqMistakeType } from "../mcq-mistakes";

export type FormattedFeedbackLine = {
  badge: string;
  text: string;
};

export type FormattedThreeLineFeedback = {
  concept?: string;
  line1: FormattedFeedbackLine; // Correct Answer mechanism
  line2: FormattedFeedbackLine; // Distractor Trap
  line3: FormattedFeedbackLine; // Takeaway / Golden Rule
  plainText: string;            // Exactly 3 lines separated by \n
};

/**
 * Cleans out filler words, redundant question stems, and parenthetical bloat,
 * ensuring each line remains strictly 1 razor-sharp sentence of 8-16 words.
 */
export function cleanAndShortenSentence(raw: unknown, maxChars = 110): string {
  if (typeof raw !== "string" || !raw.trim()) return "";

  let cleaned = stripStars(raw)
    // Remove emojis
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
    // Remove list markers, numbers, or bullet points
    .replace(/^[-•*#\d.]+\s*/, "")
    // Remove headers like "Why Option D Works:", "Golden Rule:", "The Trap:", "Distractor:", "Speed Tip:"
    .replace(
      /^(?:Why\s+Option\s+[A-D]\s+Works|Option\s+[A-D]\s+(?:is\s+(?:uniquely\s+)?correct\s+(?:because|as)\s+|works\s+because\s+|is\s+the\s+official\s+mark\s+scheme\s+answer\s+because\s+)|The\s+trap\s*(?:is|:)\s*|The\s+distractor\s*(?:trap\s*)?(?:is|:)\s*|Distractor\s*(?:is|:)\s*|Golden\s+Rule\s*(?:is|:)\s*|Rule\s*(?:is|:)\s*|Takeaway\s*(?:is|:)\s*|Speed\s+Tip\s*(?:is|:)\s*|Remember\s*:\s*|Trap\s*:\s*)/i,
      "",
    )
    // Remove verbose explanatory clauses
    .replace(
      /^(?:This\s+is\s+because|Because|As|Under\s+Cambridge\s+(?:9708|syllabus\s+conventions)[^,:]*[,:]\s*|It\s+is\s+important\s+to\s+note\s+that|A\s+[a-z\s-]+\s+is\s+defined\s+by\s+(?:two\s+key\s+characteristics|the\s+fact\s+that):\s*|The\s+most\s+tempting\s+wrong\s+option\s+is\s+[A-D]\s*\([^)]*\)\.?\s*)/i,
      "",
    )
    // Strip parenthetical definitions that bloat the line
    .replace(
      /\s*\((?:access\s+can\s+be\s+restricted|usually\s+via\s+a\s+price\s+mechanism|one\s+person's\s+use\s+diminishes[^)]*|one\s+person's\s+consumption\s+reduces[^)]*)\)/gi,
      "",
    )
    // Replace verbose "Candidates frequently confuse X with Y" with "Confuses X with Y"
    .replace(/^(?:Candidates|Students)\s+(?:frequently|often)\s+confuse\s+/i, "Confuses ")
    .replace(/^(?:The\s+distractor\s+relies\s+on\s+the\s+misconception\s+that\s+)/i, "Confuses ")
    .replace(/\s+/g, " ")
    .trim();

  // If first character is lowercase, capitalize it
  if (cleaned) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // Extract single first sentence (stopping at period, exclamation, or question mark)
  // Avoid regex lookbehinds for full Safari / WebKit compatibility.
  const sentenceEndRegex = /([.!?])\s+(?=[A-Z0-9"']|$)/g;
  const match = sentenceEndRegex.exec(cleaned);
  let firstSentence = match ? cleaned.slice(0, match.index + match[1].length).trim() : cleaned;

  // Protect standard economic abbreviations (e.g., i.e., vs., fig., no.)
  if (/^(e\.g\.|i\.e\.|fig\.|no\.|vs\.)/i.test(firstSentence) && match) {
    const nextMatch = sentenceEndRegex.exec(cleaned);
    if (nextMatch) {
      firstSentence = cleaned.slice(0, nextMatch.index + nextMatch[1].length).trim();
    }
  }

  // If sentence still exceeds maxChars, trim cleanly at natural clause boundaries
  if (firstSentence.length > maxChars) {
    const clauseBreaks = ["; ", " — ", ", so ", ", because ", ", meaning ", ", where ", ", as "];
    for (const brk of clauseBreaks) {
      const idx = firstSentence.indexOf(brk, 45);
      if (idx !== -1 && idx <= maxChars) {
        firstSentence = firstSentence.slice(0, idx).trim();
        break;
      }
    }
    if (firstSentence.length > maxChars) {
      const lastSpace = firstSentence.lastIndexOf(" ", maxChars - 2);
      firstSentence =
        (lastSpace > 40 ? firstSentence.slice(0, lastSpace) : firstSentence.slice(0, maxChars - 2)).trim() + "…";
    }
  }

  if (firstSentence && !/[.!?…]$/.test(firstSentence)) {
    firstSentence += ".";
  }

  return firstSentence;
}

/**
 * Extracts a single punchy, pitch-accurate sentence from potentially verbose text.
 * Backwards compatible with existing unit tests and callers while enforcing conciseness.
 */
export function extractSinglePunchySentence(raw: unknown, maxChars = 140): string {
  if (typeof raw !== "string" || !raw.trim()) return "";

  // 1. Clean asterisks and excess whitespace
  let cleaned = stripStars(raw)
    .replace(/^[-•*#\d.]+\s*/, "") // remove leading list numbers or bullet points
    .replace(/\s+/g, " ")
    .trim();

  // 2. Identify the first sentence end, avoiding common abbreviations and decimal points
  // Avoid regex lookbehinds for full Safari / WebKit compatibility.
  const sentenceEndRegex = /([.!?])\s+(?=[A-Z0-9"']|$)/g;
  const match = sentenceEndRegex.exec(cleaned);
  let firstSentence = match ? cleaned.slice(0, match.index + match[1].length).trim() : cleaned;

  // If first sentence has abbreviations that were falsely split (e.g. "e.g.", "i.e."), take up to next sentence
  if (/^(e\.g\.|i\.e\.|fig\.|no\.|vs\.)/i.test(firstSentence) && match) {
    const nextMatch = sentenceEndRegex.exec(cleaned);
    if (nextMatch) {
      firstSentence = cleaned.slice(0, nextMatch.index + nextMatch[1].length).trim();
    }
  }

  // 3. If first sentence is excessively long (> maxChars), safely clamp at a natural clause break
  if (firstSentence.length > maxChars) {
    const clauseBreaks = ["; ", " — ", ", because ", ", meaning ", ", where ", ", so "];
    for (const brk of clauseBreaks) {
      const idx = firstSentence.indexOf(brk, 60);
      if (idx !== -1 && idx <= maxChars) {
        firstSentence = firstSentence.slice(0, idx).trim();
        break;
      }
    }
    // If still too long, break at the last space before maxChars
    if (firstSentence.length > maxChars) {
      const lastSpace = firstSentence.lastIndexOf(" ", maxChars - 3);
      firstSentence =
        (lastSpace > 40 ? firstSentence.slice(0, lastSpace) : firstSentence.slice(0, maxChars - 3)).trim() + "…";
    }
  }

  // Ensure ends with a period if not ending with punctuation
  if (firstSentence && !/[.!?…]$/.test(firstSentence)) {
    firstSentence += ".";
  }

  return firstSentence;
}

/**
 * Generates an instant, zero-latency, syllabus-grounded Cambridge 9708
 * diagnostic breakdown for any multiple-choice question. Runs in < 1ms
 * synchronously with zero network wait.
 */
export function generateInstantMcqDiagnostic(options: {
  correctAnswer: string;
  userAnswer?: string | null;
  isCorrect?: boolean;
  questionStem?: string | null;
  topic?: string | null;
  subtopic?: string | null;
  unit?: string | null;
  level?: "as" | "a2" | "AS" | "A2" | null;
  mistakeType?: McqMistakeType | null;
}): McqDiagnostic {
  const {
    correctAnswer,
    userAnswer,
    isCorrect,
    questionStem,
    topic,
    subtopic,
    unit,
  } = options;

  const letter = (correctAnswer ?? "D").toUpperCase();
  const userLetter = userAnswer ? userAnswer.toUpperCase() : null;
  const studentGotRight = isCorrect ?? (userLetter !== null && userLetter === letter);
  const stem = (questionStem ?? "").toLowerCase();

  // 1. Classification of Goods (Public, Private, Merit, Demerit, Excludable, Rival)
  if (
    /beach|park|road|tourist|entry\s*fee|toll|overcrowd|public\s*good|private\s*good|merit\s*good|demerit\s*good|rival|exclud/i.test(
      stem,
    )
  ) {
    return {
      concept: "Classification of Goods: Public vs Private Goods",
      correctReasoning:
        letter === "D" || /private/i.test(stem)
          ? "Price barriers establish excludability and overcrowding establishes rivalry, defining a private good."
          : `Satisfies Cambridge 9708 classification criteria for Option ${letter}.`,
      distractorTrap: studentGotRight
        ? "Avoided confusing state ownership with a public good; rivalry and price exclusion define it."
        : "Confuses government ownership with a public good; non-excludability and non-rivalry are required.",
      keyRule: "Private goods are always rival and excludable, regardless of whether publicly owned.",
      speedTip: "Check for 'pays' (excludable) and 'overcrowded' (rival) to confirm private good.",
    };
  }

  // 2. PPC & Opportunity Cost
  if (/ppc|ppf|production\s*possibility|opportunity\s*cost|reallocat|forgone/i.test(stem)) {
    return {
      concept: "PPC & Opportunity Cost",
      correctReasoning:
        "Measures the single next best alternative forgone when reallocating scarce resources.",
      distractorTrap: studentGotRight
        ? "Avoided confusing monetary costs or total output with the real opportunity cost forgone."
        : "Confuses monetary price with real opportunity cost of the next best alternative forgone.",
      keyRule: "Opportunity cost is always the single next best alternative forgone.",
      speedTip: "Always identify what is sacrificed, not monetary expenditure.",
    };
  }

  // 3. Price Elasticity of Demand (PED) & Total Revenue (neutral until v2 AI proof loads)
  if (/\bped\b|price\s*elastic|inelastic\s*demand|elastic\s*demand|total\s*revenue/i.test(stem)) {
    return {
      concept: "Price Elasticity of Demand (PED)",
      correctReasoning: `Option ${letter} matches the PED formula (%ΔQd / %ΔP) and total revenue test for this scenario.`,
      distractorTrap: studentGotRight
        ? "Avoided confusing elastic demand (P and TR move inversely) with inelastic demand (same direction)."
        : `Option ${userLetter || "chosen"} reverses the PED sign or total revenue direction.`,
      keyRule: "Inelastic (|PED| < 1): P and TR move together; Elastic (|PED| > 1): P and TR move inversely.",
      speedTip: "Test |PED| = |%ΔQd / %ΔP| before linking price to total revenue.",
    };
  }

  // 4. Cross & Income Elasticity (XED & YED)
  if (
    /\bxed\b|\byed\b|cross\s*elastic|income\s*elastic|substitute|complement|inferior\s*good|normal\s*good/i.test(
      stem,
    )
  ) {
    return {
      concept: "Elasticity of Demand (XED & YED)",
      correctReasoning:
        "Positive cross-elasticity defines substitutes; negative income-elasticity defines inferior goods.",
      distractorTrap: studentGotRight
        ? "Avoided confusing cross-price signs with own-price negative slope conventions."
        : "Confuses elasticity sign rules: XED > 0 indicates substitutes, while YED < 0 indicates inferior goods.",
      keyRule: "XED > 0 indicates substitutes; YED < 0 indicates inferior goods.",
      speedTip: "Look at the sign: positive = same direction (substitutes), negative = inverse.",
    };
  }

  // 5. Maximum & Minimum Prices (Price Ceilings & Floors)
  if (/maximum\s*price|minimum\s*price|price\s*ceiling|price\s*floor|rent\s*control/i.test(stem)) {
    return {
      concept: "Government Price Controls",
      correctReasoning:
        "Effective price ceilings below equilibrium create shortages; floors above create surpluses.",
      distractorTrap: studentGotRight
        ? "Avoided confusing binding price ceiling effects with non-binding market adjustments."
        : "Confuses ceiling position (below equilibrium creates shortage) with floors (above creates surplus).",
      keyRule: "Effective ceilings sit below equilibrium; effective floors sit above equilibrium.",
      speedTip: "Remember: Ceilings are set below equilibrium; floors are set above.",
    };
  }

  // 6. Indirect Taxes & Subsidies / Tax Incidence
  if (
    /indirect\s*tax|specific\s*tax|ad\s*valorem|subsidy|subsidies|tax\s*incidence|tax\s*burden/i.test(
      stem,
    )
  ) {
    return {
      concept: "Indirect Taxes & Subsidies",
      correctReasoning:
        "Taxes shift supply upward by the tax per unit, falling heavier on the more inelastic curve.",
      distractorTrap: studentGotRight
        ? "Avoided assuming equal tax incidence between buyers and sellers regardless of elasticity."
        : "Confuses tax burden distribution: the more price-inelastic side bears the greater share.",
      keyRule: "Tax burden falls primarily on the market side with lower price elasticity.",
      speedTip: "The more inelastic curve pays the greater share of an indirect tax.",
    };
  }

  // 7. Externalities & Market Failure (neutral until v2 AI proof loads — handles both positive & negative)
  if (/externalit|social\s*cost|private\s*cost|social\s*benefit|private\s*benefit|deadweight/i.test(stem)) {
    return {
      concept: "Market Failure & Externalities",
      correctReasoning: `Option ${letter} correctly compares marginal social vs private costs/benefits to identify the welfare outcome.`,
      distractorTrap: studentGotRight
        ? "Avoided confusing private equilibrium (MPC = MPB) with the socially optimal output (MSC = MSB)."
        : `Option ${userLetter || "chosen"} confuses private and social curves or misidentifies the deadweight loss triangle.`,
      keyRule: "Social efficiency requires MSB = MSC; market equilibrium occurs where MPB = MPC.",
      speedTip: "Compare market output (MPB = MPC) against social optimum (MSB = MSC).",
    };
  }

  // 8. Exchange Rates & Balance of Payments (neutral until v2 AI proof loads — handles appreciation & depreciation)
  if (/exchange\s*rate|depreciat|appreciat|current\s*account|deficit|surplus|forex|currency/i.test(stem)) {
    return {
      concept: "Exchange Rates & Balance of Payments",
      correctReasoning: `Option ${letter} accurately traces forex demand/supply shifts and trade competitiveness.`,
      distractorTrap: studentGotRight
        ? "Avoided reversing the direction of currency demand/supply or export/import price effects."
        : `Option ${userLetter || "chosen"} reverses currency appreciation/depreciation or its trade balance impact.`,
      keyRule: "Depreciation makes exports cheaper abroad and imports pricier at home; appreciation reverses both.",
      speedTip: "Trace whether demand or supply of the domestic currency shifts in forex markets.",
    };
  }

  // 9. Macroeconomic AD/AS Equilibrium
  if (/aggregate\s*demand|aggregate\s*supply|\bad\b|\bas\b|real\s*gdp|price\s*level|inflation/i.test(stem)) {
    return {
      concept: "Macroeconomic AD/AS Equilibrium",
      correctReasoning:
        "Shifts in aggregate demand or supply alter equilibrium real GDP and price levels.",
      distractorTrap: studentGotRight
        ? "Avoided confusing demand-pull price increases with cost-push supply contractions."
        : "Confuses short-run aggregate supply shifts with movements caused by aggregate demand changes.",
      keyRule: "AD shifts move output and prices together; AS shifts move them inversely.",
      speedTip: "AD shifts move real GDP and price level in the same direction.",
    };
  }

  // 10. A2 Market Structures (Monopoly / Oligopoly / Labour)
  if (/monopoly|oligopoly|cartel|kinked|supernormal|deadweight|mrp|marginal\s*revenue|marginal\s*cost/i.test(stem)) {
    return {
      concept: "Market Structures & Efficiency",
      correctReasoning:
        "Profit maximization requires producing where Marginal Cost equals Marginal Revenue (MC = MR).",
      distractorTrap: studentGotRight
        ? "Avoided confusing revenue maximization (MR = 0) with profit maximization (MC = MR)."
        : "Confuses profit maximization (MC = MR) with productive efficiency (minimum AC) or revenue max.",
      keyRule: "All profit-maximizing firms produce where MC = MR; monopolies produce where P > MC.",
      speedTip: "Profit max is always MC = MR, never minimum AC or maximum TR.",
    };
  }

  // Fallback: Use Cambridge Syllabus Topic & Subtopic
  const displayConcept = [unit, subtopic || topic].filter(Boolean).join(" · ") || "Cambridge 9708";
  return {
    concept: displayConcept,
    correctReasoning: `Satisfies Cambridge 9708 criteria for Option ${letter} in ${subtopic || topic || "this unit"}.`,
    distractorTrap: studentGotRight
      ? `Avoided the tempting distractor option in ${subtopic || topic || "this question"}.`
      : `Option ${userLetter || "picked"} confuses cause and effect in ${subtopic || topic || "this unit"}.`,
    keyRule: "Always verify axis labels, elasticity bounds, and curve directions before deciding.",
    speedTip: `Verify syllabus rules for ${subtopic || topic || "this question"} carefully.`,
  };
}

/**
 * Formats any MCQ explanation into strictly AT MOST THREE ultra-concise,
 * pitch-accurate lines.
 *
 * Line 1: Why Option [X] is Correct (economic mechanism, ~12-16 words)
 * Line 2: The Trap (distractor diagnosis / candidate misconception, ~10-14 words)
 * Line 3: Cambridge Takeaway (golden rule / formula / syllabus takeaway, ~8-12 words)
 */
export function formatThreeLineMcqFeedback(options: {
  explanation?:
    | McqExplanationResult
    | { text?: string; diagnostic?: McqDiagnostic }
    | string
    | null
    | undefined;
  correctAnswer?: string | null;
  userAnswer?: string | null;
  isCorrect?: boolean;
  questionStem?: string | null;
  topic?: string | null;
  subtopic?: string | null;
  unit?: string | null;
  level?: "as" | "a2" | "AS" | "A2" | null;
  mistakeType?: McqMistakeType | null;
}): FormattedThreeLineFeedback {
  const {
    explanation,
    correctAnswer,
    userAnswer,
    isCorrect,
    questionStem,
    topic,
    subtopic,
    unit,
    level,
    mistakeType,
  } = options;

  const letter = (correctAnswer ?? "D").toUpperCase();
  const userLetter = userAnswer ? userAnswer.toUpperCase() : null;
  const studentGotRight = isCorrect ?? (userLetter !== null && userLetter === letter);

  // If explanation is null/undefined or loading, generate instant pitch-accurate diagnostic immediately
  let d: McqDiagnostic | null = null;

  if (
    typeof explanation === "object" &&
    explanation !== null &&
    "diagnostic" in explanation &&
    explanation.diagnostic
  ) {
    d = explanation.diagnostic;
  }

  const rawText =
    typeof explanation === "string"
      ? explanation
      : typeof explanation === "object" && explanation !== null && "text" in explanation
        ? explanation.text ?? ""
        : "";

  // If no diagnostic object but we have raw text with legacy multi-card format (Golden Rule, Trap, Speed Tip)
  if (!d && rawText.trim()) {
    const textLower = rawText.toLowerCase();
    if (
      textLower.includes("golden rule") ||
      textLower.includes("distractor trap") ||
      textLower.includes("speed tip")
    ) {
      // Split into components
      const parts = rawText.split(/(?:💡\s*Golden\s*Rule|Golden\s*Rule|Top\s*Distractor\s*Trap|The\s*Trap|⚡\s*45-Second\s*Speed\s*Tip|Speed\s*Tip)/i);
      const reasoningPart = parts[0]?.trim() || "";
      const trapPart = parts.find((p) => /confuse|trap|misconception|option\s+[a-d]|distractor/i.test(p))?.trim() || parts[2]?.trim() || "";
      const rulePart = parts.find((p) => /rule|defined|always|check|remember/i.test(p))?.trim() || parts[1]?.trim() || "";

      d = {
        concept: "",
        correctReasoning: reasoningPart,
        distractorTrap: trapPart,
        keyRule: rulePart,
        speedTip: "",
      };
    }
  }

  // If still no diagnostic, generate instant Cambridge 9708 diagnostic
  if (!d) {
    d = generateInstantMcqDiagnostic({
      correctAnswer: letter,
      userAnswer: userLetter,
      isCorrect: studentGotRight,
      questionStem,
      topic,
      subtopic,
      unit,
      level,
      mistakeType,
    });
  }

  let concept = d.concept ? stripStars(d.concept).trim() : undefined;

  // 1. Line 1: Correct reasoning (maxChars ~115)
  let l1 = cleanAndShortenSentence(d.correctReasoning, 115);
  // Strip redundant leading prefix like "Option C is correct because" to keep it razor-sharp
  l1 = l1.replace(
    new RegExp(
      `^(?:Option\\s+${letter}\\s+(?:is\\s+correct\\s+(?:because|as)\\s+|works\\s+because\\s+|is\\s+the\\s+official\\s+mark\\s+scheme\\s+answer\\s+because\\s+))`,
      "i",
    ),
    "",
  );
  if (l1) l1 = l1.charAt(0).toUpperCase() + l1.slice(1);
  if (!l1) {
    l1 = `Satisfies official Cambridge 9708 criteria for Option ${letter}.`;
  }

  // 2. Line 2: Distractor trap — prefer per-option v2 note matching THIS student's chosen wrong letter!
  const chosenOptionKey =
    !studentGotRight &&
    userLetter &&
    (userLetter === "A" || userLetter === "B" || userLetter === "C" || userLetter === "D")
      ? userLetter
      : null;
  const rawTrapSource =
    (chosenOptionKey && d.optionNotes?.[chosenOptionKey]) || d.distractorTrap;
  let l2 = cleanAndShortenSentence(rawTrapSource, 115);
  l2 = l2.replace(/^(?:The\s+trap\s*(?:is|:)\s*|Distractor\s*(?:is|:)\s*|Trap\s*:\s*)/i, "");
  if (l2) l2 = l2.charAt(0).toUpperCase() + l2.slice(1);
  if (!l2) {
    l2 = studentGotRight
      ? "Avoided the standard distractor trap of confusing movement along with curve shift."
      : userLetter
        ? `Option ${userLetter} is a common trap confusing cause with effect.`
        : "Distractors set traps around shift vs movement and elasticity signs.";
  }

  // 3. Line 3: Key rule or Takeaway (maxChars ~95)
  const ruleSource = d.keyRule?.trim() ? d.keyRule : d.speedTip;
  let l3 = cleanAndShortenSentence(ruleSource, 95);
  l3 = l3.replace(/^(?:Rule\s*:\s*|Golden\s+Rule\s*:\s*|Takeaway\s*:\s*|Speed\s+tip\s*:\s*)/i, "");
  if (l3) l3 = l3.charAt(0).toUpperCase() + l3.slice(1);
  if (!l3) {
    l3 = "Always test elasticity signs, curve directions, and definitions before deciding.";
  }

  const line1Badge = `Option ${letter}`;
  const line2Badge = studentGotRight ? "Trap Avoided" : "The Trap";
  const line3Badge = "Takeaway";

  const plainText = [
    `${line1Badge}: ${l1}`,
    `${line2Badge}: ${l2}`,
    `${line3Badge}: ${l3}`,
  ].join("\n");

  return {
    concept,
    line1: { badge: line1Badge, text: l1 },
    line2: { badge: line2Badge, text: l2 },
    line3: { badge: line3Badge, text: l3 },
    plainText,
  };
}
