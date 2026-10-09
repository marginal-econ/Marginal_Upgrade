/**
 * Zero-cost, zero-latency terminology pass. Runs before any AI call and
 * catches the handful of Cambridge 9708 terms students misspell most often
 * — these are unambiguous (a fixed string either appears or it doesn't), so
 * there is no reason to spend a model call confirming them. Anything not in
 * this list is left for the AI pass; this is a deterministic pre-filter,
 * not a replacement for it.
 */

import type { IssueCategory } from "@/hooks/use-live-examiner-check";

type GlossaryEntry = {
  wrong: string;
  correct: string;
  category?: IssueCategory;
  explanation?: string;
};

// Matched case-insensitively, whole-word. Covers unambiguous economics
// terminology and core academic mechanics misspellings.
const GLOSSARY: GlossaryEntry[] = [
  // High-frequency writing mechanics & common typos
  { wrong: "becuase", correct: "because", category: "grammar" },
  { wrong: "beacuse", correct: "because", category: "grammar" },
  { wrong: "becasue", correct: "because", category: "grammar" },
  { wrong: "cosumered", correct: "consumers", category: "grammar" },
  { wrong: "cosumers", correct: "consumers", category: "grammar" },
  { wrong: "cosumer", correct: "consumer", category: "grammar" },
  { wrong: "consumrs", correct: "consumers", category: "grammar" },
  { wrong: "faliure", correct: "failure", category: "grammar" },
  { wrong: "failiure", correct: "failure", category: "grammar" },
  { wrong: "faliures", correct: "failures", category: "grammar" },
  { wrong: "failiures", correct: "failures", category: "grammar" },
  { wrong: "goverment", correct: "government", category: "grammar" },
  { wrong: "govment", correct: "government", category: "grammar" },
  { wrong: "govnerment", correct: "government", category: "grammar" },
  { wrong: "intervantion", correct: "intervention", category: "grammar" },
  { wrong: "intervetion", correct: "intervention", category: "grammar" },
  { wrong: "intervetions", correct: "interventions", category: "grammar" },
  { wrong: "oppurtunity", correct: "opportunity", category: "grammar" },
  { wrong: "oppertunity", correct: "opportunity", category: "grammar" },
  { wrong: "negetive", correct: "negative", category: "grammar" },
  { wrong: "posetive", correct: "positive", category: "grammar" },
  { wrong: "maxium", correct: "maximum", category: "grammar" },
  { wrong: "minium", correct: "minimum", category: "grammar" },
  { wrong: "producton", correct: "production", category: "grammar" },
  { wrong: "produser", correct: "producer", category: "grammar" },
  { wrong: "produsers", correct: "producers", category: "grammar" },
  { wrong: "socitey", correct: "society", category: "grammar" },
  { wrong: "soceity", correct: "society", category: "grammar" },
  { wrong: "econmy", correct: "economy", category: "grammar" },

  // Economics terminology misspellings
  { wrong: "externailties", correct: "externalities", category: "terminology" },
  { wrong: "externalitie", correct: "externality", category: "terminology" },
  { wrong: "extenality", correct: "externality", category: "terminology" },
  { wrong: "extenalities", correct: "externalities", category: "terminology" },
  { wrong: "externalitiy", correct: "externality", category: "terminology" },
  { wrong: "externaliteis", correct: "externalities", category: "terminology" },
  { wrong: "elasticy", correct: "elasticity", category: "terminology" },
  { wrong: "elasitcity", correct: "elasticity", category: "terminology" },
  { wrong: "elascitity", correct: "elasticity", category: "terminology" },
  { wrong: "inelasitc", correct: "inelastic", category: "terminology" },
  { wrong: "inelasic", correct: "inelastic", category: "terminology" },
  { wrong: "oligopolly", correct: "oligopoly", category: "terminology" },
  { wrong: "oligopolistic competition", correct: "oligopoly", category: "terminology" },
  { wrong: "monoploy", correct: "monopoly", category: "terminology" },
  { wrong: "monoplies", correct: "monopolies", category: "terminology" },
  { wrong: "opportunity cost's", correct: "opportunity cost", category: "terminology" },
  { wrong: "marginal utillity", correct: "marginal utility", category: "terminology" },
  { wrong: "comparitive advantage", correct: "comparative advantage", category: "terminology" },
  { wrong: "comparative advantadge", correct: "comparative advantage", category: "terminology" },
  { wrong: "absoloute advantage", correct: "absolute advantage", category: "terminology" },
  { wrong: "tarrif", correct: "tariff", category: "terminology" },
  { wrong: "tarrifs", correct: "tariffs", category: "terminology" },
  { wrong: "subsidys", correct: "subsidies", category: "terminology" },
  { wrong: "deflationery", correct: "deflationary", category: "terminology" },
  { wrong: "inflationery", correct: "inflationary", category: "terminology" },
  { wrong: "flucuate", correct: "fluctuate", category: "terminology" },
  { wrong: "flucuation", correct: "fluctuation", category: "terminology" },
  { wrong: "equilibrum", correct: "equilibrium", category: "terminology" },
  { wrong: "equilbrium", correct: "equilibrium", category: "terminology" },
  { wrong: "equilibirum", correct: "equilibrium", category: "terminology" },
  { wrong: "equlibrium", correct: "equilibrium", category: "terminology" },
  { wrong: "disequilibrum", correct: "disequilibrium", category: "terminology" },
  { wrong: "diseconomys of scale", correct: "diseconomies of scale", category: "terminology" },
  { wrong: "economys of scale", correct: "economies of scale", category: "terminology" },
  { wrong: "gini coeffecient", correct: "Gini coefficient", category: "terminology" },
  { wrong: "gini co-efficient", correct: "Gini coefficient", category: "terminology" },
  { wrong: "monetory policy", correct: "monetary policy", category: "terminology" },
  { wrong: "fical policy", correct: "fiscal policy", category: "terminology" },
  { wrong: "reccession", correct: "recession", category: "terminology" },
  { wrong: "unemploymant", correct: "unemployment", category: "terminology" },
  { wrong: "productiv efficiency", correct: "productive efficiency", category: "terminology" },
  { wrong: "allocative effeciency", correct: "allocative efficiency", category: "terminology" },
  { wrong: "effeciency", correct: "efficiency", category: "terminology" },
  { wrong: "efficency", correct: "efficiency", category: "terminology" },
  { wrong: "merit good's", correct: "merit goods", category: "terminology" },
  { wrong: "demerit good's", correct: "demerit goods", category: "terminology" },
  { wrong: "public good's", correct: "public goods", category: "terminology" },
  { wrong: "marginal social benifit", correct: "marginal social benefit", category: "terminology" },
  { wrong: "marginal social benifits", correct: "marginal social benefits", category: "terminology" },
  { wrong: "marginal private benifit", correct: "marginal private benefit", category: "terminology" },
  { wrong: "benifit", correct: "benefit", category: "terminology" },
  { wrong: "benifits", correct: "benefits", category: "terminology" },
  { wrong: "demand pull inflate", correct: "demand-pull inflation", category: "terminology" },
  { wrong: "cost push inflate", correct: "cost-push inflation", category: "terminology" },
  { wrong: "Thai because", correct: "This is because", category: "grammar" },
  { wrong: "agregate demand", correct: "aggregate demand", category: "terminology" },
  { wrong: "agregate supply", correct: "aggregate supply", category: "terminology" },
  { wrong: "agregate", correct: "aggregate", category: "terminology" },
  { wrong: "consumtion", correct: "consumption", category: "terminology" },
  { wrong: "defecit", correct: "deficit", category: "terminology" },
  { wrong: "deficite", correct: "deficit", category: "terminology" },
  { wrong: "scarsity", correct: "scarcity", category: "terminology" },
  { wrong: "resourses", correct: "resources", category: "terminology" },
  { wrong: "competetive", correct: "competitive", category: "terminology" },
];

export type DeterministicIssue = {
  original: string;
  suggestion: string;
  category: IssueCategory;
  severity: "medium";
  explanation: string;
  context: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Scans plain sentences (no AI call) for known misspellings. Case is
 * preserved on the matched original text so the suggestion card shows
 * exactly what the student wrote. Detects multiple distinct errors per sentence.
 */
export function deterministicTerminologyIssues(sentences: string[]): DeterministicIssue[] {
  const found: DeterministicIssue[] = [];

  for (const sentence of sentences) {
    const occupiedRanges: Array<[number, number]> = [];

    for (const entry of GLOSSARY) {
      const pattern = new RegExp(`\\b${escapeRegExp(entry.wrong)}\\b`, "gi");
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(sentence)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        const overlaps = occupiedRanges.some(([s, e]) => Math.max(s, start) < Math.min(e, end));
        if (overlaps) continue;
        occupiedRanges.push([start, end]);

        const cat = entry.category ?? "terminology";
        found.push({
          original: match[0],
          suggestion: entry.correct,
          category: cat,
          severity: "medium",
          explanation:
            entry.explanation ||
            (cat === "grammar"
              ? `Spelling correction: "${entry.correct}".`
              : `"${entry.correct}" is the standard Cambridge 9708 spelling for this term.`),
          context: sentence,
        });
      }
    }
  }

  return found;
}
