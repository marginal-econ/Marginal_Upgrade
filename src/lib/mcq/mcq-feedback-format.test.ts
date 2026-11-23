import { describe, expect, it } from "vitest";
import {
  extractSinglePunchySentence,
  formatThreeLineMcqFeedback,
} from "./mcq-feedback-format";
import type { McqExplanationResult } from "./mcq-pdf.server";

describe("MCQ Precise 3-Line Feedback Formatter", () => {
  describe("extractSinglePunchySentence", () => {
    it("extracts only the first sentence and strips asterisks and excess spaces", () => {
      const raw =
        "**Option B is correct.** When demand is price inelastic (PED < 1), price and total revenue move in the same direction. Therefore, an increase in price increases TR.";
      const res = extractSinglePunchySentence(raw);
      expect(res).toBe("Option B is correct.");
    });

    it("handles decimal numbers without falsely breaking sentences", () => {
      const raw =
        "A PED of 0.5 means demand is price inelastic. This leads to an increase in total revenue.";
      const res = extractSinglePunchySentence(raw);
      expect(res).toBe("A PED of 0.5 means demand is price inelastic.");
    });

    it("clamps run-on sentences to avoid grueling long paragraphs", () => {
      const longSentence =
        "When an indirect tax is levied on a good with price-inelastic demand, the burden of the tax falls primarily on the consumers because suppliers are able to pass the majority of the cost increase forward onto buyers through higher prices, leaving producer surplus relatively protected.";
      const res = extractSinglePunchySentence(longSentence, 150);
      expect(res.length).toBeLessThanOrEqual(160);
      expect(res).toMatch(/[.…]$/);
    });
  });

  describe("formatThreeLineMcqFeedback", () => {
    it("formats a verbose structured diagnostic into strictly at most 3 concise lines", () => {
      const verboseExplanation: McqExplanationResult = {
        text: "Long summary paragraph that goes on and on with multiple sentences about why everything works.",
        diagnostic: {
          concept: "AS Unit 2: Price Elasticity of Demand (PED)",
          correctReasoning:
            "Option C works because when PED is less than 1, the percentage drop in quantity demanded is smaller than the percentage increase in price, causing total revenue to rise.",
          distractorTrap:
            "Option A is the classic distractor trap where candidates confuse inelastic demand with elastic demand, mistakenly thinking revenue always falls.",
          keyRule:
            "Inelastic demand: Price and Total Revenue move in the same direction.",
          speedTip: "Always check if PED < 1 before calculating numbers.",
        },
        visionGrounded: true,
      };

      const result = formatThreeLineMcqFeedback({
        explanation: verboseExplanation,
        correctAnswer: "C",
        userAnswer: "A",
        isCorrect: false,
      });

      expect(result.concept).toBe("AS Unit 2: Price Elasticity of Demand (PED)");
      expect(result.line1.badge).toBe("Option C");
      expect(result.line1.text).toBeTruthy();
      expect(result.line1.text).not.toContain("Option C is correct because");

      expect(result.line2.badge).toBe("The Trap");
      expect(result.line2.text).toContain("Option A");

      expect(result.line3.badge).toBe("Takeaway");
      expect(result.line3.text).toContain("Inelastic demand: Price and Total Revenue move in the same direction.");

      // Check plainText contains exactly 3 lines separated by \n
      const lines = result.plainText.split("\n");
      expect(lines).toHaveLength(3);
      expect(lines[0]).toContain("Option C:");
      expect(lines[1]).toContain("The Trap:");
      expect(lines[2]).toContain("Takeaway:");
    });

    it("adapts line 2 badge to 'Trap Avoided' when student answered correctly", () => {
      const explanation: McqExplanationResult = {
        text: "Great job answering correctly.",
        diagnostic: {
          concept: "A2 Unit 4: Natural Monopoly",
          correctReasoning:
            "Natural monopolies enjoy substantial continuous economies of scale across all relevant market output.",
          distractorTrap:
            "Option B incorrectly attributes natural monopoly to government legal licensing rather than cost structure.",
          keyRule: "LRAC slopes downward across the entire market demand curve.",
          speedTip: "Look for downward-sloping LRAC over entire market output.",
        },
      };

      const result = formatThreeLineMcqFeedback({
        explanation,
        correctAnswer: "D",
        userAnswer: "D",
        isCorrect: true,
      });

      expect(result.line2.badge).toBe("Trap Avoided");
      expect(result.line2.text).toContain("Option B incorrectly attributes natural monopoly");
    });

    it("formats legacy plain-text explanations into exactly 3 clean lines", () => {
      const plainTextExplanation =
        "Option B is correct because opportunity cost represents the value of the next best alternative forgone.\nMany students pick Option A which refers to total accounting costs.\nRemember that opportunity cost only counts the single next best sacrifice.";

      const result = formatThreeLineMcqFeedback({
        explanation: plainTextExplanation,
        correctAnswer: "B",
        userAnswer: "A",
      });

      const lines = result.plainText.split("\n");
      expect(lines).toHaveLength(3);
      expect(result.line1.badge).toBe("Option B");
      expect(result.line2.badge).toBe("The Trap");
      expect(result.line3.badge).toBe("Takeaway");
    });

    it("gracefully handles null or missing explanation without crashing and returns safe 3 lines", () => {
      const result = formatThreeLineMcqFeedback({
        explanation: null,
        correctAnswer: "A",
      });

      expect(result.line1.badge).toBe("Option A");
      expect(result.plainText.split("\n")).toHaveLength(3);
    });

    it("generates instant pitch-accurate 3-line feedback for Question 1 (tropical beach) with 0ms delay", () => {
      const result = formatThreeLineMcqFeedback({
        explanation: null,
        correctAnswer: "D",
        userAnswer: "D",
        isCorrect: true,
        questionStem:
          "A tourist visits a government-owned tropical beach. She pays $10 to enter but finds it overcrowded. Which type of good is the beach?",
      });

      expect(result.concept).toContain("Public vs Private Goods");
      expect(result.line1.badge).toBe("Option D");
      expect(result.line1.text).toContain("Price barriers establish excludability and overcrowding establishes rivalry");
      expect(result.line1.text.length).toBeLessThan(120);

      expect(result.line2.badge).toBe("Trap Avoided");
      expect(result.line2.text).toContain("state ownership");
      expect(result.line2.text.length).toBeLessThan(110);

      expect(result.line3.badge).toBe("Takeaway");
      expect(result.line3.text).toContain("Private goods are always rival and excludable");
      expect(result.line3.text.length).toBeLessThan(100);

      const lines = result.plainText.split("\n");
      expect(lines).toHaveLength(3);
    });

    it("compresses a verbose 250-word multi-card legacy explanation into strictly 3 short lines", () => {
      const verboseLegacy = `
price barrier to restrict access. Second, the tourist finds the beach overcrowded, which proves the good is rival in consumption because the presence of other users reduces the utility or space available to the tourist. Since the beach satisfies both conditions of excludability and rivalry, it is classified as a private good under Cambridge 9708 conventions, even though it is government-owned.

💡 Golden Rule
A private good is defined by two key characteristics: it is excludable (access can be restricted, usually via a price mechanism) and rival in consumption (one person's use diminishes the availability or quality for others).

Top Distractor Trap You Avoided
The most tempting wrong option is C (a public good). Students often confuse government ownership with the economic definition of a public good. A public good must be non-excludable and non-rival. Because the beach charges an entry fee (excludable) and suffers from overcrowding (rival), it fails the definition of a public good. The distractor relies on the misconception that state provision automatically equals a public good.

⚡ 45-Second Speed Tip
Check for the two keywords: 'pays' (indicates excludable) and 'overcrowded' (indicates rival). If both are present, the answer is always a private good, regardless of who owns the asset.
      `;

      const result = formatThreeLineMcqFeedback({
        explanation: verboseLegacy,
        correctAnswer: "D",
        userAnswer: "D",
        isCorrect: true,
      });

      expect(result.line1.badge).toBe("Option D");
      expect(result.line1.text.length).toBeLessThan(125);
      expect(result.line2.badge).toBe("Trap Avoided");
      expect(result.line2.text.length).toBeLessThan(120);
      expect(result.line3.badge).toBe("Takeaway");
      expect(result.line3.text.length).toBeLessThan(110);

      const lines = result.plainText.split("\n");
      expect(lines).toHaveLength(3);
    });
  });
});
