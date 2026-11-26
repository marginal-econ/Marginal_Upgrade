import nspell from "nspell";
import aff from "./dict/index.aff?raw";
import dic from "./dict/index.dic?raw";
import type { IssueV2 } from "./types";
import { analyzeGrammarAndMechanics, CAMBRIDGE_ECONOMICS_WHITELIST } from "./grammar-engine";
import { deterministicTerminologyIssues } from "./economics-glossary";
import { checkEconomicMisconceptions } from "./reasoning-engine";

// Lazy-initialized nspell instance
let spellChecker: ReturnType<typeof nspell> | null = null;

// Technical economic whitelist (expanded with abbreviations and terms)
const CUSTOM_WHITELIST = new Set<string>();

// Add all terms and their constituent words
for (const phrase of CAMBRIDGE_ECONOMICS_WHITELIST) {
  const norm = phrase.toLowerCase().trim();
  CUSTOM_WHITELIST.add(norm);
  for (const part of norm.split(/\s+/)) {
    if (part.length > 2) CUSTOM_WHITELIST.add(part);
  }
}

const EXTRA_TERMS = [
  "ped",
  "yed",
  "pes",
  "xed",
  "gdp",
  "gnp",
  "gni",
  "cpi",
  "rpi",
  "lras",
  "sras",
  "ad",
  "as",
  "ppc",
  "ppf",
  "mrs",
  "mpc",
  "mps",
  "mpt",
  "mpm",
  "bop",
  "fdi",
  "mne",
  "mnc",
  "tpp",
  "wto",
  "imf",
  "opec",
  "nhs",
  "uk",
  "us",
  "usa",
  "eu",
  "ceteris",
  "paribus",
  "valorem",
  "lorenz",
  "gini",
  "oligopoly",
  "monopsony",
  "externalities",
  "externality",
  "microeconomics",
  "macroeconomics",
  "diseconomies",
  "inelastic",
  "elasticity",
  "hyperinflation",
  "stagflation",
  "devaluation",
  "revaluation",
  "depreciation",
  "appreciation",
  "nationalisation",
  "privatisation",
  "deregulation",
  "subsidies",
  "subsidisation",
  "tariff",
  "tariffs",
  "quotas",
  "embargo",
  "allocative",
  "equimarginal",
  "non-rival",
  "non-rivalrous",
  "non-excludable",
  "asymmetric",
  "underprovided",
  "overprovided",
  "underconsumed",
  "overconsumed",
  "underproduced",
  "overproduced",
  "underprovision",
  "overprovision",
  "underconsumption",
  "overconsumption",
  "underallocation",
  "overallocation",
  "demerit",
  "demerits",
  "merit",
  "merits",
  "deadweight",
  "unpriced",
  "unrivalled",
  "unrivaled",
  "rivalrous",
  "excludable",
  "regressive",
  "progressive",
  "proportional",
  "behaviour",
  "behavioural",
  "behaviourist",
  "favour",
  "labour",
  "labourer",
  "labourers",
  "programme",
  "programmes",
  "practise",
  "maximisation",
  "maximising",
  "maximised",
  "minimisation",
  "minimising",
  "minimised",
  "monopolist",
  "monopolists",
  "monopolistic",
  "subsidise",
  "subsidised",
  "subsidising",
  "subsidize",
  "subsidized",
  "subsidizing",
  "privatise",
  "privatised",
  "privatising",
  "privatize",
  "privatized",
  "privatizing",
  "nationalise",
  "nationalised",
  "nationalising",
  "nationalize",
  "nationalized",
  "nationalizing",
  "diseconomy",
  "elasticities",
  "inelasticities",
  "advalorem",
  "inelasticity",
  "equilibrium",
  "disequilibrium",
  "disincentive",
  "disincentives",
  "monopsonist",
  "monopsonistic",
  "external",
  "spillover",
  "spillovers",
  // Valid UK/US academic & economics morphological variants (never penalize US vs UK spelling)
  "specialise",
  "specialised",
  "specialising",
  "specialisation",
  "specialize",
  "specialized",
  "specializing",
  "specialization",
  "maximise",
  "maximize",
  "maximizing",
  "maximized",
  "maximization",
  "minimise",
  "minimize",
  "minimizing",
  "minimized",
  "minimization",
  "analyse",
  "analysed",
  "analysing",
  "analyze",
  "analyzed",
  "analyzing",
  "prioritise",
  "prioritised",
  "prioritising",
  "prioritize",
  "prioritized",
  "prioritizing",
  "prioritization",
  "prioritisation",
  "summarise",
  "summarised",
  "summarising",
  "summarize",
  "summarized",
  "summarizing",
  "incentivise",
  "incentivised",
  "incentivising",
  "incentivize",
  "incentivized",
  "incentivizing",
  "internalise",
  "internalised",
  "internalising",
  "internalize",
  "internalized",
  "internalizing",
  "externalise",
  "externalised",
  "externalising",
  "externalize",
  "externalized",
  "externalizing",
  "monopolise",
  "monopolised",
  "monopolising",
  "monopolize",
  "monopolized",
  "monopolizing",
  "stabilise",
  "stabilised",
  "stabilising",
  "stabilize",
  "stabilized",
  "stabilizing",
  "stabilisation",
  "stabilization",
  "globalisation",
  "globalization",
  "liberalisation",
  "liberalization",
  "deregulated",
  "deregulating",
  "underconsume",
  "overconsume",
  "underproduce",
  "overproduce",
  "underallocate",
  "overallocate",
  "labor",
  "behavior",
  "behavioral",
  "favor",
  "favorable",
  "favourable",
  "program",
  "programs",
  "countercyclical",
  "procyclical",
  "microeconomic",
  "macroeconomic",
  "socioeconomic",
  "disinflationary",
  "stagflationary",
  "uncompetitive",
  "competitiveness",
  "creditworthy",
  "reallocate",
  "reallocated",
  "reallocation",
  "misallocate",
  "misallocated",
  "misallocation",
  "crowding",
  "pigouvian",
  "keynesian",
  "monetarist",
  "neoclassical",
  "oligopolistic",
  "contestability",
  "supernormal",
  "subnormal",
  "disutility",
  "indifference",
  "interdependence",
  "collusive",
  "predatory",
  "asymmetry",
  "asymmetries",
  "externalities",
];

for (const t of EXTRA_TERMS) {
  CUSTOM_WHITELIST.add(t.toLowerCase());
}

// Fast 1-edit Damerau-Levenshtein economics vocabulary ranker (only runs when nspell rejects a word)
const ECON_SPELL_TARGETS: string[] = Array.from(CUSTOM_WHITELIST).filter(
  (w) => /^[a-z]{5,}$/.test(w),
);

function damerauDistance1(a: string, b: string): boolean {
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  if (a === b) return false;

  if (la === lb) {
    let diffs = 0;
    let firstIdx = -1;
    for (let i = 0; i < la; i++) {
      if (a[i] !== b[i]) {
        diffs++;
        if (firstIdx === -1) firstIdx = i;
        if (diffs > 2) return false;
      }
    }
    if (diffs === 1) return true;
    // Adjacent transposition
    return diffs === 2 && a[firstIdx] === b[firstIdx + 1] && a[firstIdx + 1] === b[firstIdx];
  }

  // Insertion or deletion of 1 char
  const shorter = la < lb ? a : b;
  const longer = la < lb ? b : a;
  let i = 0;
  let j = 0;
  let skipped = false;
  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) {
      i++;
      j++;
    } else if (!skipped) {
      skipped = true;
      j++;
    } else {
      return false;
    }
  }
  return true;
}

function findClosestEconTerm(word: string): string | undefined {
  const lower = word.toLowerCase();
  if (lower.length < 5) return undefined;
  // Collapse triple repeated letters first (e.g. "suppply" -> "supply", "demmand" handled below)
  const collapsed = lower.replace(/([a-z])\1{2,}/g, "$1$1");
  if (CUSTOM_WHITELIST.has(collapsed)) return collapsed;
  const singleCollapsed = lower.replace(/([a-z])\1{2,}/g, "$1");
  if (CUSTOM_WHITELIST.has(singleCollapsed)) return singleCollapsed;

  for (const target of ECON_SPELL_TARGETS) {
    if (target[0] === lower[0] && damerauDistance1(lower, target)) {
      return target;
    }
  }
  return undefined;
}

function preserveWordCase(original: string, replacement: string): string {
  if (original === original.toUpperCase()) return replacement.toUpperCase();
  if (original[0] === original[0]?.toUpperCase()) {
    return replacement[0]!.toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function getSpellChecker(): ReturnType<typeof nspell> {
  if (!spellChecker) {
    spellChecker = nspell(aff, dic);
    // Add custom terms to nspell
    for (const word of CUSTOM_WHITELIST) {
      if (typeof word === "string" && !word.includes(" ")) {
        spellChecker.add(word);
      }
    }
  }
  return spellChecker;
}

/** Words that are legitimately repeated occasionally in English / Economics */
const LEGITIMATE_REPEATS = new Set(["that", "had"]);

/**
 * Runs Layer A local synchronous checks on a single segment.
 * Returns IssueV2[] with exact document offsets [from, to].
 * STRICT RULE: Only evaluate completed sentences. Never interrupt in-progress typing mid-sentence.
 */
export function runLocalChecksOnSegment(segment: {
  id: string;
  from: number;
  to: number;
  text: string;
  isComplete?: boolean;
}): IssueV2[] {
  // Only evaluate completed sentences — let the person write without mid-sentence flags
  if (segment.isComplete === false) {
    return [];
  }

  const issues: IssueV2[] = [];
  const coveredSpans: Array<{ from: number; to: number }> = [];
  const overlapsCovered = (from: number, to: number) =>
    coveredSpans.some((s) => Math.max(s.from, from) < Math.min(s.to, to));
  const addIssue = (iss: IssueV2) => {
    if (iss.from < 0 || iss.to <= iss.from) return;
    if (overlapsCovered(iss.from, iss.to)) return;
    coveredSpans.push({ from: iss.from, to: iss.to });
    issues.push(iss);
  };

  const text = segment.text;

  // Ignore diagram placeholders [DIAGRAM: ...] and illegible marks [?]
  if (/^\[DIAGRAM:[^\]]*\]$/i.test(text.trim()) || text.trim() === "[?]") {
    return [];
  }

  // 0a. Deterministic Cambridge Economics Misconceptions (highest priority, 0 AI tokens)
  const misconceptions = checkEconomicMisconceptions(text, segment.id);
  for (const m of misconceptions) {
    addIssue({
      ...m,
      from: segment.from + m.from,
      to: segment.from + m.to,
    });
  }

  // 0b. Deterministic Cambridge Terminology Spelling Glossary (0 AI tokens)
  const termIssues = deterministicTerminologyIssues([text]);
  for (let i = 0; i < termIssues.length; i++) {
    const t = termIssues[i]!;
    const idx = text.toLowerCase().indexOf(t.original.toLowerCase());
    if (idx === -1) continue;
    addIssue({
      id: `term_${segment.id}_${idx}`,
      from: segment.from + idx,
      to: segment.from + idx + t.original.length,
      sentenceId: segment.id,
      category: "terminology",
      severity: t.severity,
      original: text.slice(idx, idx + t.original.length),
      suggestion: t.suggestion,
      explanation: t.explanation,
      status: "active",
    });
  }

  // 0c. Full In-House Grammar, Mechanics, Clarity & Academic Tone Engine (0 AI tokens)
  const grammarIssues = analyzeGrammarAndMechanics([text]);
  for (const g of grammarIssues) {
    const absFrom = segment.from + g.startOffset;
    const absTo = segment.from + g.endOffset;
    addIssue({
      id: `gram_${g.ruleId}_${segment.id}_${g.startOffset}`,
      from: absFrom,
      to: absTo,
      sentenceId: segment.id,
      category: g.category,
      severity: g.severity,
      original: g.original,
      suggestion: g.suggestion,
      explanation: g.explanation,
      evidence: g.evidence,
      status: "active",
    });
  }

  const speller = getSpellChecker();

  // 1. Spellcheck words (tokens matching [a-zA-Z]+(-[a-zA-Z]+)?)
  const wordRegex = /\b[A-Za-z]+(?:-[A-Za-z]+)?\b/g;
  let match: RegExpExecArray | null;

  while ((match = wordRegex.exec(text)) !== null) {
    const word = match[0];
    const lower = word.toLowerCase();

    // Skip short words or technical/glossary terms
    if (word.length <= 2) continue;
    if (CUSTOM_WHITELIST.has(lower)) continue;

    // Skip if all caps (likely acronym like OPEC, WTO, LRAS)
    if (word === word.toUpperCase() && word.length > 1) continue;

    // Never flag half-words currently being typed
    const isAtEnd = match.index + word.length >= text.length;
    const isTrailingIncomplete =
      segment.isComplete === false &&
      match.index + word.length >= text.trimEnd().length &&
      !/[.!?]['"’”\)\]]*$/.test(text);

    if (isAtEnd || isTrailingIncomplete) {
      continue;
    }

    const absFrom = segment.from + match.index;
    const absTo = absFrom + word.length;
    if (overlapsCovered(absFrom, absTo)) continue;

    // If hyphenated (e.g. non-price, short-run, profit-maximizing), verify parts
    let isCorrect = speller.correct(word);
    if (!isCorrect && word.includes("-")) {
      const parts = word.split("-");
      const allPartsValid = parts.every(
        (part) =>
          part.length <= 2 ||
          CUSTOM_WHITELIST.has(part.toLowerCase()) ||
          speller.correct(part) ||
          part.toLowerCase() === "non" ||
          part.toLowerCase() === "multi" ||
          part.toLowerCase() === "sub",
      );
      if (allPartsValid) {
        isCorrect = true;
      }
    }

    if (!isCorrect) {
      // 1. Prefer exact 1-edit Cambridge Economics term recovery (e.g. "inflatyon" -> "inflation", "monopoky" -> "monopoly")
      const econExact = findClosestEconTerm(word);
      const suggestions = econExact ? [preserveWordCase(word, econExact)] : speller.suggest(word);
      // 2. Otherwise prefer economics-domain suggestions when nspell offers multiple candidates
      const econPreferred = suggestions?.find((s) => CUSTOM_WHITELIST.has(s.toLowerCase()));
      const rawTop = econPreferred ?? (suggestions && suggestions.length > 0 ? suggestions[0] : undefined);
      const topSuggestion = rawTop ? preserveWordCase(word, rawTop) : undefined;

      // Discard invalid or blank suggestions where suggestion matches original
      if (!topSuggestion || topSuggestion.toLowerCase().trim() === word.toLowerCase().trim()) {
        continue;
      }

      addIssue({
        id: `spell_${segment.id}_${match.index}`,
        from: absFrom,
        to: absTo,
        sentenceId: segment.id,
        category: "spelling",
        severity: "medium",
        original: word,
        suggestion: topSuggestion,
        explanation: `Possible spelling error. Did you mean "${topSuggestion}"?`,
        status: "active",
      });
    }
  }

  // 2. High-precision rule: Repeated consecutive words ("the the", "is is")
  const repeatRegex = /\b([a-zA-Z]{2,})\s+\1\b/gi;
  while ((match = repeatRegex.exec(text)) !== null) {
    const word = match[1]!;
    if (LEGITIMATE_REPEATS.has(word.toLowerCase())) continue;

    const from = segment.from + match.index;
    const to = from + match[0].length;

    addIssue({
      id: `repeat_${segment.id}_${match.index}`,
      from,
      to,
      sentenceId: segment.id,
      category: "grammar",
      severity: "low",
      original: match[0],
      suggestion: word,
      explanation: `Repeated word: "${word}" appears consecutively.`,
      status: "active",
    });
  }

  // 3. Unmatched brackets or parentheses inside sentence (only flag when sentence is complete)
  if (segment.isComplete !== false) {
    const openParens = (text.match(/\(/g) || []).length;
    const closeParens = (text.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      addIssue({
        id: `unmatched_paren_${segment.id}`,
        from: segment.from,
        to: segment.to,
        sentenceId: segment.id,
        category: "punctuation",
        severity: "low",
        original: text,
        explanation: "Unmatched parentheses found in this sentence.",
        status: "active",
      });
    }
  }

  return issues;
}
