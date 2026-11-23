import { stripStars } from "../utils";
import type { McqDiagnostic, McqExplanationResult } from "./mcq-pdf.server";

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
 * Extracts a single punchy, pitch-accurate sentence from potentially verbose text.
 * Respects decimal points (e.g. 1.5, 0.2), abbreviations (e.g., i.e., vs., fig.),
 * and clamps run-on sentences to at most maxChars without cutting mid-word.
 */
export function extractSinglePunchySentence(raw: unknown, maxChars = 175): string {
  if (typeof raw !== "string" || !raw.trim()) return "";

  // 1. Clean asterisks and excess whitespace
  let cleaned = stripStars(raw)
    .replace(/^[-•*#\d.]+\s*/, "") // remove leading list numbers or bullet points
    .replace(/\s+/g, " ")
    .trim();

  // 2. Identify the first sentence end, avoiding common abbreviations and decimal points
  // Match period, exclamation, or question mark followed by space or end of string
  const sentenceEndRegex = /(?<=[.!?])\s+(?=[A-Z0-9"']|$)/g;
  const match = sentenceEndRegex.exec(cleaned);
  let firstSentence = match ? cleaned.slice(0, match.index).trim() : cleaned;

  // If first sentence has abbreviations that were falsely split (e.g. "e.g.", "i.e."), take up to next sentence
  if (/^(e\.g\.|i\.e\.|fig\.|no\.|vs\.)/i.test(firstSentence) && match) {
    const nextMatch = sentenceEndRegex.exec(cleaned);
    if (nextMatch) {
      firstSentence = cleaned.slice(0, nextMatch.index).trim();
    }
  }

  // 3. If first sentence is excessively long (> maxChars), safely clamp at a natural clause break
  if (firstSentence.length > maxChars) {
    const clauseBreaks = ["; ", " — ", ", because ", ", meaning ", ", where ", ", so "];
    for (const brk of clauseBreaks) {
      const idx = firstSentence.indexOf(brk, 70);
      if (idx !== -1 && idx <= maxChars) {
        firstSentence = firstSentence.slice(0, idx).trim();
        break;
      }
    }
    // If still too long, break at the last space before maxChars
    if (firstSentence.length > maxChars) {
      const lastSpace = firstSentence.lastIndexOf(" ", maxChars - 3);
      firstSentence = (lastSpace > 50 ? firstSentence.slice(0, lastSpace) : firstSentence.slice(0, maxChars - 3)).trim() + "…";
    }
  }

  // Ensure ends with a period if not ending with punctuation
  if (firstSentence && !/[.!?…]$/.test(firstSentence)) {
    firstSentence += ".";
  }

  return firstSentence;
}

/**
 * Formats any MCQ explanation (structured diagnostic or plain text) into
 * strictly AT MOST THREE punchy, pitch-accurate lines.
 *
 * Line 1: Why Option [X] is Correct (economic mechanism)
 * Line 2: The Trap (distractor diagnosis / candidate misconception)
 * Line 3: Cambridge Takeaway (golden rule / formula / syllabus takeaway)
 */
export function formatThreeLineMcqFeedback(options: {
  explanation: McqExplanationResult | { text?: string; diagnostic?: McqDiagnostic } | string | null | undefined;
  correctAnswer?: string | null;
  userAnswer?: string | null;
  isCorrect?: boolean;
}): FormattedThreeLineFeedback {
  const { explanation, correctAnswer, userAnswer, isCorrect } = options;

  const letter = (correctAnswer ?? "correct").toUpperCase();
  const userLetter = userAnswer ? userAnswer.toUpperCase() : null;
  const studentGotRight = isCorrect ?? (userLetter !== null && userLetter === letter);

  // If explanation is null/undefined
  if (!explanation) {
    return {
      line1: {
        badge: `Option ${letter}`,
        text: `Option ${letter} is the official Cambridge 9708 mark scheme answer.`,
      },
      line2: {
        badge: "The Trap",
        text: "Review question stem carefully to avoid distractor traps.",
      },
      line3: {
        badge: "Takeaway",
        text: "Verify definitions and curve shift directions before picking.",
      },
      plainText: `Option ${letter} is the official Cambridge 9708 mark scheme answer.\nReview question stem carefully to avoid distractor traps.\nVerify definitions and curve shift directions before picking.`,
    };
  }

  const d =
    typeof explanation === "object" && explanation !== null && "diagnostic" in explanation
      ? explanation.diagnostic
      : null;

  const rawText =
    typeof explanation === "string"
      ? explanation
      : typeof explanation === "object" && explanation !== null && "text" in explanation
        ? explanation.text ?? ""
        : "";

  let concept = d?.concept ? stripStars(d.concept).trim() : undefined;

  // Case A: Diagnostic object present
  if (d) {
    // 1. Line 1: Correct reasoning
    let l1 = extractSinglePunchySentence(d.correctReasoning, 185);
    // Strip redundant leading prefix like "Option C is correct because" to keep it razor-sharp
    l1 = l1.replace(new RegExp(`^(Option\\s+${letter}\\s+(is\\s+correct\\s+(because|as)\\s+|works\\s+because\\s+))`, "i"), "");
    // Capitalize first letter
    if (l1) l1 = l1.charAt(0).toUpperCase() + l1.slice(1);
    if (!l1) {
      l1 = `Satisfies the official Cambridge 9708 syllabus requirement for Option ${letter}.`;
    }

    // 2. Line 2: Distractor trap
    let l2 = extractSinglePunchySentence(d.distractorTrap, 175);
    // Strip redundant leading "Distractor: " or "The trap: " if present
    l2 = l2.replace(/^(The\s+trap\s*(is|:)\s*|Distractor\s*(is|:)\s*|Trap\s*:\s*)/i, "");
    if (l2) l2 = l2.charAt(0).toUpperCase() + l2.slice(1);
    if (!l2) {
      l2 = studentGotRight
        ? "Candidates frequently confuse the underlying curve shift with a movement along the curve."
        : userLetter
          ? `Option ${userLetter} is a common trap confusing the cause with the effect.`
          : "Distractors set traps around shift vs movement and elastic vs inelastic responses.";
    }

    // 3. Line 3: Key rule or Takeaway
    const ruleSource = d.keyRule?.trim() ? d.keyRule : d.speedTip;
    let l3 = extractSinglePunchySentence(ruleSource, 160);
    l3 = l3.replace(/^(Rule\s*:\s*|Golden\s+Rule\s*:\s*|Takeaway\s*:\s*|Speed\s+tip\s*:\s*)/i, "");
    if (l3) l3 = l3.charAt(0).toUpperCase() + l3.slice(1);
    if (!l3) {
      l3 = "Always test elasticity, shift triggers, and axis definitions before finalizing.";
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

  // Case B: Only raw plain text explanation available
  const cleanRaw = stripStars(rawText).trim();
  const rawLines = cleanRaw
    .split(/\r?\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  let l1 = "";
  let l2 = "";
  let l3 = "";

  if (rawLines.length >= 3) {
    l1 = extractSinglePunchySentence(rawLines[0], 180);
    l2 = extractSinglePunchySentence(rawLines[1], 170);
    l3 = extractSinglePunchySentence(rawLines[2], 160);
  } else {
    // Split plain text by sentences
    const sentences = cleanRaw
      .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    l1 = extractSinglePunchySentence(sentences[0] || cleanRaw, 180);
    l2 = extractSinglePunchySentence(sentences[1] || "", 170);
    l3 = extractSinglePunchySentence(sentences[2] || "", 160);
  }

  // Fallbacks if only 1 sentence existed
  if (!l2) {
    l2 = studentGotRight
      ? "Avoided the standard distractor trap of confusing movement along with curve shift."
      : userLetter
        ? `Option ${userLetter} fails because it misinterprets the economic mechanism.`
        : "Distractor options exploit common sign and curve direction misconceptions.";
  }
  if (!l3) {
    l3 = "Remember: verify curve movements, elasticity signs, and axes carefully.";
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
