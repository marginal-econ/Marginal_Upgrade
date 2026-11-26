import { describe, expect, it } from "vitest";
import {
  buildCompactDeltaSystemPrompt,
  buildCompactDeltaUserPrompt,
  buildFallbackBlueprint,
  reconcileVerifiedMark,
  verifyDeltaIssues,
  type DirtySentencePayload,
} from "./delta-engine";
import { runLocalChecksOnSegment } from "./local-checks";
import { segmentEssay } from "./segment";

describe("Live Examiner 3.0 — Delta-Rubric Hybrid Engine", () => {
  describe("Token Budget & Compact Prompt Discipline", () => {
    it("keeps system prompt ultra-compact (< 3000 chars / ~750 tokens) even with huge RAG context", () => {
      const hugeRagContext = Array.from(
        { length: 80 },
        (_, i) => `- Syllabus chunk ${i}: Indirect taxation shifts supply vertically upwards by the tax per unit, raising equilibrium price and reducing quantity traded.`,
      ).join("\n");

      const blueprint = buildFallbackBlueprint({
        question: "Discuss whether an indirect tax is the best way to reduce the consumption of demerit goods.",
        level: "as",
        maxMark: 12,
        contextBlock: hugeRagContext,
      });

      const sysPrompt = buildCompactDeltaSystemPrompt({
        question: "Discuss whether an indirect tax is the best way to reduce the consumption of demerit goods.",
        level: "as",
        maxMark: 12,
        blueprint,
      });

      expect(sysPrompt.length).toBeLessThan(3000);
      expect(sysPrompt).toContain("SKIP spelling/punctuation/basic grammar");
      expect(sysPrompt).toContain("AO1(2)");
      expect(sysPrompt).toContain("AO2(6)");
      expect(sysPrompt).toContain("AO3(4)");
    });

    it("sends ONLY dirty sentences and compact 1-line prior summaries in user prompt", () => {
      const dirty: DirtySentencePayload[] = [
        {
          i: 1,
          id: "s_new_1",
          hash: "abc12345",
          text: "However, if demand for cigarettes is price inelastic, the tax will cause a proportionately smaller fall in quantity demanded.",
          paragraphIndex: 2,
        },
      ];

      const userPrompt = buildCompactDeltaUserPrompt({
        dirtySentences: dirty,
        priorSummaries: [
          { ao: "ao1", gist: "Defined demerit goods as over-consumed with negative externalities." },
          { ao: "ao2", gist: "Explained indirect tax raises MPC, shifting supply left." },
        ],
        essayStats: { wordCount: 240, paragraphCount: 3, hasDiagram: false },
      });

      expect(userPrompt).toContain("ESSAY STATS: 240 words | 3 paragraphs | diagram: no");
      expect(userPrompt).toContain("PRIOR VERIFIED (2 sentences):");
      expect(userPrompt).toContain("1. [P3] However, if demand for cigarettes is price inelastic");
      expect(userPrompt.length).toBeLessThan(600);
    });
  });

  describe("Cambridge 9708 Grading Accuracy & Tariff Calibration", () => {
    it("enforces 2/6/0 split on 8-mark non-evaluative Explain questions", () => {
      const question = "Explain how an indirect tax corrects negative externalities in consumption.";
      const blueprint = buildFallbackBlueprint({ question, level: "as", maxMark: 8 });

      expect(blueprint.requiresEvaluation).toBe(false);
      expect(blueprint.split).toEqual({ ao1_marks: 2, ao2_marks: 6, ao3_marks: 0 });

      const essay = Array.from({ length: 6 }, () =>
        "An indirect tax is levied on expenditure and increases firms' marginal private cost of production. This shifts the supply curve vertically upwards from S to S1, raising equilibrium price from P1 to P2 and contracting quantity demanded from Q1 to Q2 towards the social optimum where MSC equals MSB."
      ).join("\n\n");

      const mark = reconcileVerifiedMark({
        aiMark: { ao1: 2, ao2: 5, ao3: 2, conf: 0.9, head: "Strong explanation" },
        essayText: essay,
        question,
        maxMark: 8,
        blueprint,
      });

      expect(mark).not.toBeNull();
      expect(mark!.ao_breakdown.evaluation.out_of).toBe(0);
      expect(mark!.ao_breakdown.evaluation.awarded).toBe(0);
      expect(mark!.ao_breakdown.knowledge.awarded).toBe(2);
      expect(mark!.ao_breakdown.analysis.awarded).toBe(5);
      expect(mark!.total_mark).toBe(7);
    });

    it("preserves accurate Top-Band AI marks on well-paragraphed 12-mark essays without regex sabotage", () => {
      const question = "Discuss whether an indirect tax is the most effective way to reduce consumption of demerit goods.";
      const blueprint = buildFallbackBlueprint({ question, level: "as", maxMark: 12 });

      // 4 distinct paragraphs, ~460+ words
      const para =
        "A demerit good is one whose consumption generates negative externalities and information failure, meaning marginal private benefit exceeds marginal social benefit and the free market over-allocates resources. When the government imposes a specific indirect tax on producers, marginal costs rise and the supply curve shifts vertically upwards, raising market price and incentivising consumers to contract quantity demanded towards the socially optimal output. ";
      const evalPara =
        "By contrast, an information campaign directly tackles information failure without imposing a regressive tax burden. On balance, a combined approach pairing indirect taxation with education is most effective.";
      const multiParaEssay = [para + para, para + para, para + para, evalPara].join("\n\n");

      const mark = reconcileVerifiedMark({
        aiMark: { ao1: 2, ao2: 6, ao3: 3, conf: 0.9, head: "Top-band analysis and evaluation" },
        essayText: multiParaEssay,
        question,
        maxMark: 12,
        blueprint,
      });

      expect(mark).not.toBeNull();
      expect(mark!.total_mark).toBe(11);
      expect(mark!.ao_breakdown.knowledge.awarded).toBe(2);
      expect(mark!.ao_breakdown.analysis.awarded).toBe(6);
      expect(mark!.ao_breakdown.evaluation.awarded).toBe(3);
    });

    it("enforces required-diagram Level 2 cap when prompt asks for a diagram and unlocks when attached", () => {
      const question = "With the help of a diagram, discuss whether a subsidy increases consumer welfare.";
      const blueprint = buildFallbackBlueprint({ question, level: "as", maxMark: 12 });
      expect(blueprint.requiresDiagram).toBe(true);

      const baseEssay = Array.from({ length: 9 }, () =>
        "A subsidy lowers firms' unit production costs, shifting market supply rightwards and lowering equilibrium price while expanding quantity traded. However, the incidence of the subsidy depends on the price elasticity of demand and supply, and carries a fiscal opportunity cost for the government budget."
      ).join("\n\n");

      const withoutDiagram = reconcileVerifiedMark({
        aiMark: { ao1: 2, ao2: 6, ao3: 3, conf: 0.88, head: "Good analysis" },
        essayText: baseEssay,
        question,
        maxMark: 12,
        blueprint,
      });
      expect(withoutDiagram!.ao_breakdown.analysis.awarded).toBeLessThanOrEqual(4);
      expect(withoutDiagram!.total_mark).toBe(
        withoutDiagram!.ao_breakdown.knowledge.awarded +
          withoutDiagram!.ao_breakdown.analysis.awarded +
          withoutDiagram!.ao_breakdown.evaluation.awarded,
      );

      const withDiagram = reconcileVerifiedMark({
        aiMark: { ao1: 2, ao2: 6, ao3: 3, conf: 0.88, head: "Good analysis" },
        essayText: `${baseEssay}\n\n[DIAGRAM: Subsidy Supply Shift | axes: Price / Quantity | curves: D, S, S1]`,
        question,
        maxMark: 12,
        blueprint,
      });
      expect(withDiagram!.ao_breakdown.analysis.awarded).toBe(6);
      expect(withDiagram!.total_mark).toBe(11);
    });

    it("gives strictly 0 marks for fragments (<10 words)", () => {
      const question = "Discuss the effectiveness of indirect taxes.";
      const blueprint = buildFallbackBlueprint({ question, level: "as", maxMark: 12 });
      const mark = reconcileVerifiedMark({
        aiMark: { ao1: 1, ao2: 1, ao3: 0, conf: 0.5, head: "Fragment" },
        essayText: "Indirect taxes raise prices.",
        question,
        maxMark: 12,
        blueprint,
      });
      expect(mark!.total_mark).toBe(0);
    });
  });

  describe("6-Point Deterministic Verification Gate", () => {
    const blueprint = buildFallbackBlueprint({
      question: "Discuss whether an indirect tax reduces consumption of demerit goods.",
      level: "as",
      maxMark: 12,
      contextBlock: "- An indirect tax increases marginal private cost and shifts the supply curve vertically upwards, never the demand curve.",
    });

    const dirty: DirtySentencePayload[] = [
      {
        i: 1,
        id: "s_1",
        hash: "h1",
        text: "An indirect tax shifts the demand curve left, which leads to lower consumption.",
        paragraphIndex: 0,
      },
    ];

    it("rejects synonym swaps, unanchored spans, and ungrounded claims while keeping verified misconceptions", () => {
      const result = verifyDeltaIssues({
        rawIssues: [
          // 1. Synonym swap -> MUST BE REJECTED
          {
            i: 1,
            orig: "leads to",
            fix: "results in",
            cat: "analysis",
            sev: "low",
            why: "Results in sounds slightly more formal here.",
            ev: "style",
            ao_imp: "",
            conf: 0.9,
          },
          // 2. Hallucinated span not in sentence -> MUST BE REJECTED
          {
            i: 1,
            orig: "subsidy shifts supply",
            fix: "tax shifts supply",
            cat: "economics_accuracy",
            sev: "high",
            why: "You wrote subsidy instead of tax.",
            ev: "indirect tax increases marginal private cost",
            ao_imp: "AO2",
            conf: 0.95,
          },
          // 3. Ungrounded accuracy claim -> MUST BE REJECTED
          {
            i: 1,
            orig: "lower consumption",
            fix: "zero consumption",
            cat: "economics_accuracy",
            sev: "medium",
            why: "Always goes to zero completely.",
            ev: "random unsupported statement",
            ao_imp: "",
            conf: 0.8,
          },
          // 4. Genuine verified Cambridge misconception -> MUST BE KEPT & MARK SENTENCE FATAL
          {
            i: 1,
            orig: "shifts the demand curve left",
            fix: "shifts the supply curve left",
            cat: "economics_accuracy",
            sev: "high",
            why: "An indirect tax raises producer costs and shifts the supply curve left, not demand.",
            ev: "An indirect tax increases marginal private cost and shifts the supply curve vertically upwards",
            ao_imp: "Protects AO2 analysis",
            conf: 0.95,
          },
        ],
        dirtySentences: dirty,
        blueprint,
      });

      expect(result.verifiedIssues).toHaveLength(1);
      // normalizeIssueSpan trims "shifts the demand curve left" -> "shifts the supply curve left" to minimal drop-in "demand" -> "supply"
      expect(result.verifiedIssues[0]!.original).toBe("demand");
      expect(result.verifiedIssues[0]!.suggestion).toBe("supply");
      expect(result.fatalSentenceIndices.has(1)).toBe(true);
      expect(result.rejectedCount).toBe(3);
    });
  });

  describe("In-House Zero-Token Grammar, Spelling & Misconception Engine (Layer A)", () => {
    it("catches grammar, homophones, typos, and misconceptions locally in 0ms without literal template bugs", () => {
      const text =
        "The government should of taxed externailties because this effects demand and is to expensive for consumers.";
      const segs = segmentEssay(text);
      expect(segs).toHaveLength(1);

      const issues = runLocalChecksOnSegment(segs[0]!);
      const originals = issues.map((i) => i.original.toLowerCase());

      expect(originals).toContain("should of");
      expect(originals).toContain("externailties");
      expect(originals).toContain("this effects demand");
      expect(originals).toContain("is to expensive");

      // Ensure no broken literal "${m[1]}" ever appears in any explanation
      for (const iss of issues) {
        expect(iss.explanation).not.toContain("${m[1]}");
      }

      // Ensure zero overlapping spans
      const sorted = [...issues].sort((a, b) => a.from - b.from);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i]!.from).toBeGreaterThanOrEqual(sorted[i - 1]!.to);
      }
    });

    it("has zero false positives on valid US/UK Cambridge economics terminology", () => {
      const text =
        "Firms maximize supernormal profit where marginal revenue equals marginal cost, ceteris paribus, while governments internalize negative externalities to reduce deadweight welfare loss.";
      const segs = segmentEssay(text);
      const issues = runLocalChecksOnSegment(segs[0]!);
      expect(issues).toHaveLength(0);
    });

    it("recovers 1-edit economics typos via Damerau-Levenshtein and catches homophones & punctuation spacing", () => {
      const text =
        "Whether inflatyon rises depends on weather monopoky firms keep suppply tight , because prices where rising and this cause inflation.";
      const segs = segmentEssay(text);
      const issues = runLocalChecksOnSegment(segs[0]!);
      const map = new Map(issues.map((i) => [i.original.toLowerCase(), i.suggestion?.toLowerCase()]));

      expect(map.get("inflatyon")).toBe("inflation");
      expect(map.get("monopoky")).toBe("monopoly");
      expect(map.get("suppply")).toBe("supply");
      expect(map.get("depends on weather")).toBe("depends on whether");
      expect(map.get("prices where rising")).toBe("prices were rising");
      expect(map.get("this cause inflation")).toBe("this causes inflation");
      expect(map.get("tight ,")).toBe("tight,");
    });

    it("protects valid Cambridge 9708 core axioms (MSB<MPB, MSC>MPC, MR=MC, P=MC) from LLM false positives", () => {
      const blueprint = buildFallbackBlueprint({
        question: "Discuss whether an indirect tax corrects demerit goods market failure.",
        level: "as",
        maxMark: 12,
      });
      const dirty: DirtySentencePayload[] = [
        {
          i: 1,
          id: "s_1",
          hash: "h1",
          text: "Demerit goods create market failure because marginal social benefit is lower than marginal private benefit.",
          paragraphIndex: 0,
        },
        {
          i: 2,
          id: "s_2",
          hash: "h2",
          text: "A profit-maximising monopoly produces where MR = MC rather than where P = MC.",
          paragraphIndex: 1,
        },
      ];
      const gate = verifyDeltaIssues({
        rawIssues: [
          {
            i: 1,
            orig: "marginal social benefit is lower than marginal private benefit",
            fix: "marginal social cost is higher than marginal private cost",
            cat: "economics_accuracy",
            sev: "high",
            why: "Demerit goods involve costs not benefits.",
            ev: "negative externalities involve marginal social cost",
            ao_imp: "AO1",
            conf: 0.95,
          },
          {
            i: 2,
            orig: "MR = MC",
            fix: "AR = AC",
            cat: "economics_accuracy",
            sev: "high",
            why: "Profit max is AR = AC.",
            ev: "monopoly profit maximising output",
            ao_imp: "AO1",
            conf: 0.9,
          },
        ],
        dirtySentences: dirty,
        blueprint,
      });

      expect(gate.verifiedIssues).toHaveLength(0);
      expect(gate.rejectedCount).toBe(2);
      expect(gate.fatalSentenceIndices.size).toBe(0);
    });

    it("enforces Cambridge AO3 proportionality when AO2 analysis is weak", () => {
      const question = "Discuss whether fiscal policy is the best way to reduce unemployment.";
      const blueprint = buildFallbackBlueprint({ question, level: "a2", maxMark: 12 });
      const essay = Array.from({ length: 5 }, () =>
        "Fiscal policy uses government spending and taxation to influence aggregate demand. However, its effectiveness depends on the multiplier, time lags, and crowding out in the economy."
      ).join("\n\n");

      const mark = reconcileVerifiedMark({
        aiMark: { ao1: 2, ao2: 2, ao3: 4, conf: 0.85, head: "Thin analysis" },
        essayText: essay,
        question,
        maxMark: 12,
        blueprint,
      });
      // Since AO2 (2/6) < 50%, AO3 cannot be 4/4 — capped at 2/4
      expect(mark!.ao_breakdown.evaluation.awarded).toBeLessThanOrEqual(2);
      expect(mark!.total_mark).toBe(
        mark!.ao_breakdown.knowledge.awarded +
          mark!.ao_breakdown.analysis.awarded +
          mark!.ao_breakdown.evaluation.awarded,
      );
    });

    it("enforces highlight-to-mark coherence, fatal misconception L2 cap, and Paper 4 Table B conclusion requirement", () => {
      const question = "Evaluate whether a profit-maximising monopoly is always undesirable for consumers.";
      const blueprint = buildFallbackBlueprint({ question, level: "a2", maxMark: 20 });

      const longEssay = Array.from({ length: 12 }, () =>
        "A monopoly exists where a single dominant firm controls the market with high barriers to entry. Profit maximisation occurs where marginal revenue equals marginal cost (MR = MC), leading to higher prices and lower output than perfect competition, generating deadweight welfare loss and allocative inefficiency."
      ).join("\n\n");

      // Case 1: Fatal misconception present + no concluding judgement -> AO2 capped <= 8/12, AO3 capped <= 3/6
      const flawed = reconcileVerifiedMark({
        aiMark: { ao1: 2, ao2: 11, ao3: 5, conf: 0.9, head: "Strong monopoly analysis" },
        essayText: longEssay,
        question,
        maxMark: 20,
        blueprint,
        verifiedCounts: {
          ao1Sentences: 2,
          ao2Sentences: 6,
          ao3Sentences: 3,
          hasConcludingJudgement: false,
          fatalMisconceptionCount: 1,
        },
      });
      expect(flawed!.ao_breakdown.analysis.awarded).toBeLessThanOrEqual(8);
      expect(flawed!.ao_breakdown.evaluation.awarded).toBeLessThanOrEqual(3);
      expect(flawed!.total_mark).toBe(
        flawed!.ao_breakdown.knowledge.awarded +
          flawed!.ao_breakdown.analysis.awarded +
          flawed!.ao_breakdown.evaluation.awarded,
      );

      // Case 2: 0 verified AO2 sentences -> AO2 MUST be 0 (never courtesy-mark AO2 when 0 green sentences exist)
      const zeroAo2 = reconcileVerifiedMark({
        aiMark: { ao1: 2, ao2: 2, ao3: 0, conf: 0.8, head: "Definitions only" },
        essayText: longEssay,
        question,
        maxMark: 20,
        blueprint,
        verifiedCounts: {
          ao1Sentences: 2,
          ao2Sentences: 0,
          ao3Sentences: 0,
          hasConcludingJudgement: false,
          fatalMisconceptionCount: 1,
        },
      });
      expect(zeroAo2!.ao_breakdown.analysis.awarded).toBe(0);
      expect(zeroAo2!.total_mark).toBe(2);

      // Case 3: Clean essay with concluding judgement -> unlocks full Paper 4 Top Band (18/20)
      const cleanTopBand = reconcileVerifiedMark({
        aiMark: { ao1: 2, ao2: 11, ao3: 5, conf: 0.92, head: "Top-band Paper 4 response" },
        essayText: `${longEssay}\n\nOn balance, whether a monopoly is undesirable depends most critically on whether supernormal profits are reinvested into dynamic efficiency and innovation.`,
        question,
        maxMark: 20,
        blueprint,
        verifiedCounts: {
          ao1Sentences: 2,
          ao2Sentences: 6,
          ao3Sentences: 4,
          hasConcludingJudgement: true,
          fatalMisconceptionCount: 0,
        },
      });
      expect(cleanTopBand!.total_mark).toBe(18);
      expect(cleanTopBand!.ao_breakdown.analysis.awarded).toBe(11);
      expect(cleanTopBand!.ao_breakdown.evaluation.awarded).toBe(5);
    });

    it("catches expanded Cambridge 9708 misconceptions locally at 0 tokens (PPC, min/max price, exchange rates, monopoly)", () => {
      const cases = [
        "A minimum price below equilibrium causes a surplus in the labour market.",
        "A maximum price above equilibrium causes a shortage of housing.",
        "A currency depreciation makes exports more expensive abroad.",
        "A point inside the PPC indicates allocative inefficiency in the economy.",
        "A profit-maximising monopoly is allocatively efficient.",
      ];
      for (const sentence of cases) {
        const seg = segmentEssay(sentence)[0]!;
        const issues = runLocalChecksOnSegment(seg);
        expect(issues.some((i) => i.category === "economics_accuracy" && i.severity === "high")).toBe(true);
      }
    });
  });
});
