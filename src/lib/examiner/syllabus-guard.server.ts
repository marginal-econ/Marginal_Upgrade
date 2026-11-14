/**
 * Syllabus Guardrail for Marginal (Cambridge 9708 Economics).
 *
 * Prevents non-economics submissions (e.g. Cambridge 9990 Psychology,
 * 9700 Biology, 9695 Literature, history, random text) from:
 * 1. Consuming student daily essay allowances.
 * 2. Burning costly multi-stage AI grading tokens.
 * 3. Polluting the economics vector database, platform marks, and student analytics.
 */

import { chat } from "../ai.server";
import { MODEL_FAST } from "./config";

export class OffSyllabusError extends Error {
  readonly detectedSubject: string;
  readonly reason: string;

  constructor(detectedSubject: string, reason: string) {
    super(
      `This question appears to be from ${detectedSubject || "another subject"} rather than Cambridge International AS/A Level Economics (9708). Marginal is exclusively calibrated for 9708 Economics. ${reason ? `(${reason})` : ""}`,
    );
    this.name = "OffSyllabusError";
    this.detectedSubject = detectedSubject;
    this.reason = reason;
  }
}

/**
 * High-confidence Cambridge 9708 Economics keywords and concept stems.
 * If a question contains clear, unambiguous economic terminology,
 * it passes instantly without burning an extra AI classification roundtrip.
 */
const HIGH_CONFIDENCE_ECON_TERMS: RegExp[] = [
  /\binflation\b/i,
  /\bdeflation\b/i,
  /\bgdp\b/i,
  /\bgross domestic product\b/i,
  /\baggregate demand\b/i,
  /\baggregate supply\b/i,
  /\belasticit(y|ies)\b/i,
  /\bped\b/i,
  /\byed\b/i,
  /\bxed\b/i,
  /\bpes\b/i,
  /\bprice elasticity\b/i,
  /\bincome elasticity\b/i,
  /\bcross elasticity\b/i,
  /\bmonetary policy\b/i,
  /\bfiscal policy\b/i,
  /\bsupply[- ]side polic(y|ies)\b/i,
  /\bunemployment\b/i,
  /\bmerit good(s)?\b/i,
  /\bdemerit good(s)?\b/i,
  /\bpublic good(s)?\b/i,
  /\bexternalit(y|ies)\b/i,
  /\bmarket failure\b/i,
  /\bdeadweight loss\b/i,
  /\bproduction possibilit(y|ies)\b/i,
  /\bppc\b/i,
  /\bppf\b/i,
  /\bopportunity cost\b/i,
  /\bconsumer surplus\b/i,
  /\bproducer surplus\b/i,
  /\bcomparative advantage\b/i,
  /\babsolute advantage\b/i,
  /\bterms of trade\b/i,
  /\bcurrent account\b/i,
  /\bbalance of payments\b/i,
  /\btariff(s)?\b/i,
  /\bquota(s)?\b/i,
  /\bexchange rate(s)?\b/i,
  /\bmonopol(y|ies|istic)\b/i,
  /\boligopol(y|ies)\b/i,
  /\bperfect competition\b/i,
  /\ballocative efficienc(y|ies)\b/i,
  /\bproductive efficienc(y|ies)\b/i,
  /\bdynamic efficienc(y|ies)\b/i,
  /\bdivision of labo(u)?r\b/i,
  /\beconomies of scale\b/i,
  /\bdiseconomies of scale\b/i,
  /\bprice ceiling\b/i,
  /\bprice floor\b/i,
  /\bmaximum price\b/i,
  /\bminimum price\b/i,
  /\bminimum wage\b/i,
  /\bindirect tax(es)?\b/i,
  /\bsubsid(y|ies)\b/i,
  /\bkeynesian\b/i,
  /\bmonetarist\b/i,
  /\bphillips curve\b/i,
  /\bmarginal utilit(y|ies)\b/i,
  /\bdiminishing returns\b/i,
  /\bhank model\b/i,
  /\bcentral bank\b/i,
  /\binterest rate(s)?\b/i,
  /\bquantitative easing\b/i,
  /\bcost-push\b/i,
  /\bdemand-pull\b/i,
  /\blabour market\b/i,
  /\bfree market\b/i,
  /\bmixed econom(y|ies)\b/i,
  /\bcommand econom(y|ies)\b/i,
];

/**
 * Obvious keywords from other school subjects that strongly signal
 * non-economics content (e.g. Psychology, Biology, Literature, Chemistry).
 */
const OBVIOUS_OFF_SYLLABUS_TERMS: { pattern: RegExp; subject: string }[] = [
  { pattern: /\b(autistic|autism|doodle|doodling|semi-structured interview|naturalistic observation|participant observation|bandura|milgram|zimbardo|loftus)\b/i, subject: "Psychology (Syllabus 9990)" },
  { pattern: /\b(photosynthesis|chloroplast|mitochondri(a|on)|cellular respiration|dna replication|mitosis|meiosis|enzyme substrate)\b/i, subject: "Biology (Syllabus 9700)" },
  { pattern: /\b(shakespeare|macbeth|hamlet|soliloquy|iambic pentameter|stanza|sonnet|protagonist|antagonist)\b/i, subject: "English Literature (Syllabus 9695)" },
  { pattern: /\b(titration|stoichiometry|covalent bond|ionic bond|periodic table|enthalpy of combustion)\b/i, subject: "Chemistry (Syllabus 9701)" },
  { pattern: /\b(projectile motion|kinematics|gravitational potential|quantum mechanics|electromagnetic induction)\b/i, subject: "Physics (Syllabus 9702)" },
];

export type SyllabusValidationResult = {
  isEconomics: boolean;
  detectedSubject: string;
  reason: string;
};

/**
 * Fast syllabus pre-flight validator.
 * Throws `OffSyllabusError` if the question or excerpt is non-economics.
 */
export async function validateEconomicsSyllabus(
  question: string,
  essayExcerpt?: string,
): Promise<SyllabusValidationResult> {
  const trimmed = question?.trim() ?? "";
  if (trimmed.length < 10) {
    throw new Error("Question is too short to evaluate. Please provide a full essay question.");
  }

  // 1. Check for blatant off-syllabus subject keywords
  for (const { pattern, subject } of OBVIOUS_OFF_SYLLABUS_TERMS) {
    if (pattern.test(trimmed)) {
      throw new OffSyllabusError(
        subject,
        `Question contains explicit terminology from ${subject}.`,
      );
    }
  }

  // 2. High-confidence heuristic match for Economics
  const hasStrongEconSignal = HIGH_CONFIDENCE_ECON_TERMS.some((term) => term.test(trimmed));
  if (hasStrongEconSignal) {
    return {
      isEconomics: true,
      detectedSubject: "Cambridge 9708 Economics",
      reason: "Matched official Cambridge 9708 Economics curriculum terminology.",
    };
  }

  // 3. For ambiguous questions without clear economic keywords, run a fast LLM classification
  try {
    const prompt = `You are a strict syllabus gatekeeper for Marginal, an AI marking platform calibrated exclusively for Cambridge International AS & A Level Economics (Syllabus 9708).

Your task: Determine whether the question below belongs to Economics (Cambridge 9708 or secondary/higher education economics), OR if it belongs to another subject (Psychology, Biology, History, Literature, Physics, Chemistry, casual chat, or nonsensical text).

Question:
"${trimmed.slice(0, 1000)}"

${essayExcerpt ? `Student Essay Excerpt:\n"${essayExcerpt.slice(0, 400)}"\n` : ""}

Respond ONLY with a valid JSON object in this format:
{
  "isEconomics": boolean,
  "detectedSubject": string,
  "reason": string
}`;

    const res = await chat({
      model: MODEL_FAST,
      temperature: 0,
      json: true,
      messages: [{ role: "user", content: prompt }],
      maxCompletionTokens: 400,
    });

    const parsed = JSON.parse(res.text.trim()) as {
      isEconomics?: boolean;
      detectedSubject?: string;
      reason?: string;
    };

    if (parsed.isEconomics === false) {
      throw new OffSyllabusError(
        parsed.detectedSubject || "an off-syllabus subject",
        parsed.reason || "Question is outside Cambridge 9708 Economics scope.",
      );
    }

    return {
      isEconomics: true,
      detectedSubject: parsed.detectedSubject || "Cambridge 9708 Economics",
      reason: parsed.reason || "Validated as Economics content.",
    };
  } catch (err) {
    if (err instanceof OffSyllabusError) throw err;
    // Non-blocking fallback: if the classification call itself fails or times out,
    // we allow the request through to let the primary examiner prompt's rejection clause handle it.
    console.warn("Syllabus guardrail classifier encountered an error; falling back to examiner prompt:", err);
    return {
      isEconomics: true,
      detectedSubject: "Unknown (Fallback)",
      reason: "Classifier fallback",
    };
  }
}
