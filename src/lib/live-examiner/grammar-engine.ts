/**
 * Next-Generation Deterministic Grammar, Clarity & Academic Writing Engine.
 * 
 * Provides Grammarly-level multi-layer writing diagnostics for Cambridge Economics:
 * - Layer 1: Mechanics & Grammar (subject-verb agreement, modal verbs, repeated words, articles)
 * - Layer 2: Sentence Construction & Clarity (redundancy, wordiness, convoluted expressions)
 * - Layer 3: Academic Writing Tone (informal idioms, colloquial phrasing, precision)
 * - Layer 4: Subject-Specific Economic Misconceptions (shift vs movement, fiscal vs monetary, public vs merit)
 * 
 * Runs in 0ms without consuming AI tokens or API credits.
 * Includes a strict Cambridge whitelist to eliminate false positives on technical economics terms.
 */

import type { IssueCategory, IssueSeverity } from "@/hooks/use-live-examiner-check";

export type GrammarRuleIssue = {
  original: string;
  suggestion: string;
  category: IssueCategory;
  severity: IssueSeverity;
  explanation: string;
  context: string;
  evidence?: string;
  ruleId: string;
  startOffset: number;
  endOffset: number;
};

type RuleDefinition = {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  pattern: RegExp;
  getSuggestion: (match: RegExpExecArray) => string;
  explanation: string;
  evidence?: string;
};

// ---------------------------------------------------------------------------
// 1. Cambridge Economics Whitelist — terms that must NEVER be flagged as errors
// ---------------------------------------------------------------------------
export const CAMBRIDGE_ECONOMICS_WHITELIST: ReadonlySet<string> = new Set([
  // Latin economic terms
  "ceteris paribus",
  "ex ante",
  "ex post",
  "per capita",
  "de facto",
  "ad valorem",
  "quid pro quo",

  // Core technical concepts
  "diseconomies",
  "diseconomies of scale",
  "economies of scale",
  "monopsony",
  "monopolistic competition",
  "oligopoly",
  "externalities",
  "negative externality",
  "positive externality",
  "merit good",
  "merit goods",
  "demerit good",
  "demerit goods",
  "public good",
  "public goods",
  "non-rival",
  "non-rivalrous",
  "non-excludable",
  "deadweight loss",
  "allocative efficiency",
  "productive efficiency",
  "dynamic efficiency",
  "x-inefficiency",
  "asymmetric information",
  "moral hazard",
  "adverse selection",
  "hyperinflation",
  "stagflation",
  "deflationary",
  "inflationary",
  "disinflation",
  "crowding out",
  "crowding-out",
  "seigniorage",
  "liquidity trap",
  "multiplier",
  "accelerator",
  "marginal propensity",
  "supply-side",
  "demand-side",
  "balance of payments",
  "current account",
  "capital account",
  "financial account",
  "terms of trade",
  "purchasing power parity",
  "comparative advantage",
  "absolute advantage",
  "opportunity cost",
  "production possibility frontier",
  "production possibility curve",
  "regressive tax",
  "progressive tax",
  "proportional tax",
  "marshall-lerner",
  "j-curve",
  "kuznets curve",
  "lorenz curve",
  "gini coefficient",
  "phillips curve",
  "harrod-domar",
  "keynesian",
  "monetarist",
  "pigouvian",
  "pareto optimal",
  "pareto efficiency",
  "tradable permits",
  "cap and trade",
]);

// ---------------------------------------------------------------------------
// 2. Multi-Layer Rules
// ---------------------------------------------------------------------------

const RULES: RuleDefinition[] = [
  // --- LAYER 1: Mechanics & Grammar ---
  {
    id: "repeated_words",
    category: "grammar",
    severity: "medium",
    pattern: /\b(the|in|of|to|is|and|that|for|with|as|at|on)\s+\1\b/i,
    getSuggestion: (m) => m[1],
    explanation: "Accidental repeated word.",
  },
  {
    id: "sv_government_plural",
    category: "grammar",
    severity: "low",
    pattern: /\bthe\s+government\s+(are|were|have)\b/i,
    getSuggestion: (m) => {
      const v = m[1].toLowerCase();
      const repl = v === "are" ? "is" : v === "were" ? "was" : "has";
      return `the government ${repl}`;
    },
    explanation: "In academic English, 'government' functions as a singular collective entity ('the government is/has').",
  },
  {
    id: "sv_central_bank",
    category: "grammar",
    severity: "low",
    pattern: /\bthe\s+central\s+bank\s+(are|have)\b/i,
    getSuggestion: (m) => {
      const v = m[1].toLowerCase();
      return `the central bank ${v === "are" ? "is" : "has"}`;
    },
    explanation: "'The central bank' is singular; use 'is' or 'has'.",
  },
  {
    id: "sv_consumers_has",
    category: "grammar",
    severity: "medium",
    pattern: /\bconsumers\s+has\b/i,
    getSuggestion: () => "consumers have",
    explanation: "Plural subject 'consumers' requires plural verb 'have'.",
  },
  {
    id: "sv_firms_aims",
    category: "grammar",
    severity: "medium",
    pattern: /\bfirms\s+(aims|seeks|wants|produces)\b/i,
    getSuggestion: (m) => `firms ${m[1].slice(0, -1)}`,
    explanation: "Plural subject 'firms' requires plural verb form.",
  },
  {
    id: "modal_verb_inflection",
    category: "grammar",
    severity: "high",
    pattern: /\b(will|can|could|would|should|may|might|must)\s+(causes|leads|increases|decreases|results|creates|shifts)\b/i,
    getSuggestion: (m) => `${m[1]} ${m[2].slice(0, -1)}`,
    explanation: "Modal auxiliary verbs must be followed by base form of the verb without '-s'.",
  },
  {
    id: "modal_leads_to",
    category: "grammar",
    severity: "high",
    pattern: /\b(can|could|will|would|might|should)\s+leads\s+to\b/i,
    getSuggestion: (m) => `${m[1]} lead to`,
    explanation: "Modal verbs require base verb: use 'lead to' instead of 'leads to'.",
  },
  {
    id: "article_vowel_sound",
    category: "grammar",
    severity: "medium",
    pattern: /\ba\s+(economy|economic|equilibrium|increase|decrease|externality|elasticity|oligopoly|opportunity|interest|inflationary)\b/i,
    getSuggestion: (m) => `an ${m[1]}`,
    explanation: "Use indefinite article 'an' before words beginning with vowel sounds.",
  },
  {
    id: "article_consonant_sound",
    category: "grammar",
    severity: "medium",
    pattern: /\ban\s+(market|price|subsidy|tariff|government|tax|firm|monopoly|surplus|deficit)\b/i,
    getSuggestion: (m) => `a ${m[1]}`,
    explanation: "Use indefinite article 'a' before consonant sounds.",
  },

  // --- LAYER 2: Sentence Construction, Redundancy & Clarity ---
  {
    id: "redundancy_due_to_the_fact",
    category: "clarity",
    severity: "low",
    pattern: /\bdue\s+to\s+the\s+fact\s+that\b/i,
    getSuggestion: () => "because",
    explanation: "Concise academic phrasing: 'because' is more direct than 'due to the fact that'.",
  },
  {
    id: "redundancy_at_this_moment",
    category: "clarity",
    severity: "low",
    pattern: /\bat\s+(?:this\s+moment\s+in\s+time|the\s+present\s+moment\s+in\s+time)\b/i,
    getSuggestion: () => "currently",
    explanation: "'Currently' or 'at present' expresses this with greater conciseness.",
  },
  {
    id: "redundancy_in_order_to",
    category: "clarity",
    severity: "low",
    pattern: /\bin\s+order\s+to\b/i,
    getSuggestion: () => "to",
    explanation: "'To' carries identical analytical meaning without unnecessary wordiness.",
  },
  {
    id: "redundancy_has_the_ability",
    category: "clarity",
    severity: "low",
    pattern: /\bhas\s+the\s+(?:ability|capability)\s+to\b/i,
    getSuggestion: () => "can",
    explanation: "Use direct modal verb 'can' for active, concise economic analysis.",
  },
  {
    id: "redundancy_take_into_consideration",
    category: "clarity",
    severity: "low",
    pattern: /\btake\s+into\s+consideration\b/i,
    getSuggestion: () => "consider",
    explanation: "'Consider' conveys the same meaning more concisely.",
  },
  {
    id: "redundancy_bring_about",
    category: "clarity",
    severity: "low",
    pattern: /\bbring\s+about\s+an?\s+(increase|decrease|reduction|expansion)\s+in\b/i,
    getSuggestion: (m) => {
      const noun = m[1].toLowerCase();
      if (noun === "increase" || noun === "expansion") return "increase";
      return "reduce";
    },
    explanation: "Use active verbs (e.g. 'increase' or 'reduce') rather than nominalised phrases like 'bring about an increase'.",
  },

  // --- LAYER 3: Academic Writing Tone & Precision ---
  {
    id: "academic_tone_a_lot_of",
    category: "clarity",
    severity: "low",
    pattern: /\b(?:a\s+lot\s+of|lots\s+of)\b/i,
    getSuggestion: () => "a substantial volume of",
    explanation: "'A lot of' is informal in Cambridge essays; prefer 'a substantial quantity of', 'significant', or 'widespread'.",
  },
  {
    id: "academic_tone_huge",
    category: "clarity",
    severity: "low",
    pattern: /\b(?:huge|massive)\s+(amount|quantity|impact|effect)\b/i,
    getSuggestion: (m) => `substantial ${m[1]}`,
    explanation: "'Substantial' or 'significant' is standard academic tone for 9708 essays.",
  },
  {
    id: "academic_tone_things",
    category: "clarity",
    severity: "medium",
    pattern: /\b(?:good|bad)\s+(?:things|stuff)\b/i,
    getSuggestion: (m) => (m[0].toLowerCase().includes("good") ? "positive economic outcomes" : "adverse economic effects"),
    explanation: "Vague colloquial phrasing. Specify precise economic outcomes or welfare impacts.",
  },
  {
    id: "academic_tone_money_printing",
    category: "terminology",
    severity: "medium",
    pattern: /\bmoney\s+printing\b/i,
    getSuggestion: () => "quantitative easing",
    explanation: "Cambridge standard terminology is 'quantitative easing' (asset purchases) or 'expansionary monetary policy'.",
  },

  // --- LAYER 4: Subject-Specific Economic Misconceptions ---
  {
    id: "misconception_shift_vs_movement_demand",
    category: "misconception",
    severity: "high",
    pattern: /\bdemand\s+(?:increased|increased|decreased|fell)\s+because\s+the\s+price\s+(?:fell|dropped|decreased|rose|increased)\b/i,
    getSuggestion: (m) => {
      const isRise = /fell|dropped|decreased/i.test(m[0]);
      return isRise ? "quantity demanded increased (movement along demand curve)" : "quantity demanded fell (movement along demand curve)";
    },
    explanation: "Fundamental misconception: a change in price causes a movement along the demand curve ('change in quantity demanded'), NOT a shift in demand.",
    evidence: "A change in the price of the good itself causes a movement along the demand curve, whereas a change in non-price determinants shifts the curve.",
  },
  {
    id: "misconception_shift_vs_movement_supply",
    category: "misconception",
    severity: "high",
    pattern: /\bsupply\s+(?:increased|increased|decreased|fell)\s+because\s+the\s+price\s+(?:fell|dropped|decreased|rose|increased)\b/i,
    getSuggestion: (m) => {
      const isRise = /rose|increased/i.test(m[0]);
      return isRise ? "quantity supplied increased (movement along supply curve)" : "quantity supplied decreased (movement along supply curve)";
    },
    explanation: "Fundamental misconception: price changes cause a movement along the supply curve ('quantity supplied'), not a shift of the supply curve.",
    evidence: "A change in the price of the good leads to a movement along the supply curve, distinct from shifts caused by changes in costs of production.",
  },
  {
    id: "misconception_fiscal_interest_rates",
    category: "misconception",
    severity: "high",
    pattern: /\bfiscal\s+policy\s+(?:lowered|cut|reduced|raised|increased)\s+interest\s+rates\b/i,
    getSuggestion: () => "monetary policy adjusted interest rates",
    explanation: "Instrument confusion: interest rates are determined by monetary policy (central banks), while fiscal policy controls taxation and government expenditure.",
    evidence: "Monetary policy involves changes in interest rates and money supply; fiscal policy involves government spending and taxation.",
  },
  {
    id: "misconception_monetary_taxation",
    category: "misconception",
    severity: "high",
    pattern: /\bmonetary\s+policy\s+(?:increased|cut|raised|reduced)\s+(?:taxes|taxation|government\s+spending)\b/i,
    getSuggestion: () => "fiscal policy adjusted taxes",
    explanation: "Instrument confusion: taxes and government spending are instruments of fiscal policy, not monetary policy.",
    evidence: "Fiscal policy is the manipulation of government spending and taxation to influence aggregate demand.",
  },
  {
    id: "misconception_public_vs_merit_health",
    category: "misconception",
    severity: "high",
    pattern: /\bpublic\s+goods\s+such\s+as\s+(?:healthcare|health\s+care|education|schools|hospitals)\b/i,
    getSuggestion: () => "merit goods such as healthcare and education",
    explanation: "Healthcare and education are merit goods (excludable and rival in consumption, with positive externalities), NOT public goods (which must be non-excludable and non-rival).",
    evidence: "Merit goods are rival and excludable goods that are under-consumed in a free market due to information failure and positive externalities, unlike pure public goods.",
  },
  {
    id: "misconception_deflation_vs_disinflation",
    category: "misconception",
    severity: "high",
    pattern: /\bdeflation\s+means\s+(?:prices\s+are\s+rising\s+slower|inflation\s+is\s+slowing|the\s+rate\s+of\s+inflation\s+is\s+falling)\b/i,
    getSuggestion: () => "disinflation means a falling inflation rate, whereas deflation is a negative inflation rate (falling price level)",
    explanation: "A falling rate of positive inflation is 'disinflation'. 'Deflation' specifically denotes a sustained fall in the general price level (negative inflation rate).",
    evidence: "Deflation is a persistent decrease in the general price level, whereas disinflation refers to a decrease in the rate of inflation while it remains positive.",
  },
  {
    id: "misconception_current_account_vs_budget",
    category: "misconception",
    severity: "high",
    pattern: /\ba\s+current\s+account\s+deficit\s+means\s+the\s+government\s+(?:spends\s+more\s+than\s+it\s+taxes|is\s+in\s+debt)\b/i,
    getSuggestion: () => "a budget (fiscal) deficit occurs when government spending exceeds tax revenue",
    explanation: "Confusing international trade with government accounts: a current account deficit is net trade & income outflows; a budget deficit is government spending exceeding tax revenue.",
    evidence: "The current account records trade in goods, services, primary income and secondary income. A budget deficit occurs when government expenditure exceeds tax revenue.",
  },
];

/**
 * Executes multi-layer deterministic grammar, clarity, and economic accuracy checks.
 * Detects exact character spans and filters false positives against the Cambridge whitelist.
 */
export function analyzeGrammarAndMechanics(sentences: string[]): GrammarRuleIssue[] {
  const issues: GrammarRuleIssue[] = [];
  const seenKeys = new Set<string>();

  for (const sentence of sentences) {
    for (const rule of RULES) {
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(sentence)) !== null) {
        const matchedText = match[0];
        const lowerMatched = matchedText.toLowerCase().trim();

        // 1. Whitelist Check: never flag approved economic terminology
        if (CAMBRIDGE_ECONOMICS_WHITELIST.has(lowerMatched)) {
          if (!regex.global) break;
          continue;
        }

        const suggestion = rule.getSuggestion(match);
        const dedupeKey = `${rule.id}::${sentence.trim().toLowerCase()}::${matchedText.toLowerCase()}`;

        if (!seenKeys.has(dedupeKey)) {
          seenKeys.add(dedupeKey);
          issues.push({
            original: matchedText,
            suggestion,
            category: rule.category,
            severity: rule.severity,
            explanation: rule.explanation,
            evidence: rule.evidence,
            context: sentence,
            ruleId: rule.id,
            startOffset: match.index,
            endOffset: match.index + matchedText.length,
          });
        }

        if (!regex.global) break;
      }
    }
  }

  return issues;
}
