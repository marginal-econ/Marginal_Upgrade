/**
 * AI-generated essay QUESTION (not the model answer) — the symmetric
 * counterpart to the MCQ generator, for the "AI-generated" tab of the
 * essay question bank. Grounded in the same knowledge base as the model
 * essay generator, deliberately varied so two calls on the same topic
 * don't converge on the same familiar textbook phrasing.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { chat } from "../ai.server";
import { MODEL_QUESTION_GEN } from "../examiner/config";
import { extractFirstJsonObject } from "../examiner/json";
import { renderContext, retrieve } from "../retrieval.server";

export type GeneratedEssayQuestion = {
  question: string;
  topic: string;
  maxMark: 8 | 12 | 20;
};

const COMMAND_WORDS = [
  "Discuss",
  "Assess",
  "To what extent",
  "Evaluate",
  "Consider the extent to which",
];

// A rotating set of contexts so repeated generations don't all default to
// the same textbook country/industry example — nudges genuine variety
// without controlling the model's actual answer content.
const CONTEXTS = [
  "a small open developing economy",
  "an advanced manufacturing economy",
  "an economy heavily dependent on primary commodity exports",
  "a fast-growing emerging market",
  "a small island tourism-dependent economy",
  "a large economy with a significant informal sector",
];

const CONTRACT = `
Return ONLY one JSON object:
{ "question": string, "topic": string, "max_mark": 8 | 12 | 20 }
`.trim();

export async function generateEssayQuestion(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  options: {
    level: "as" | "a2";
    topic: string;
    maxMark?: 8 | 12 | 20;
    /** Recent question text this student/teacher has already seen, to avoid repeats. */
    excludeQuestions?: string[];
  },
) {
  let sources: Awaited<ReturnType<typeof retrieve>> = [];
  try {
    sources = await retrieve(supabase, {
      query: `${options.topic} — evaluative essay-worthy issues, debates and trade-offs`,
      matchCount: 8,
      docTypes: ["coursebook", "syllabus", "past_paper", "mark_scheme", "examiner_report"],
      enableHybridRrf: true,
    });
  } catch (error) {
    console.error("Essay question generation retrieval failed", error);
  }

  const command = COMMAND_WORDS[Math.floor(Math.random() * COMMAND_WORDS.length)];
  const context = CONTEXTS[Math.floor(Math.random() * CONTEXTS.length)];
  const maxMark = options.maxMark ?? ([8, 12, 20] as const)[Math.floor(Math.random() * 3)];

  const systemPrompt = [
    "You are a Cambridge International 9708 Economics assessment writer, writing a",
    "single original evaluative essay question in real exam style —",
    options.level === "a2" ? "A Level Paper 3/4 standard." : "AS Level Paper 2 standard.",
    "",
    "Rules:",
    "- The question must be genuinely answerable at length (an evaluative essay), never a",
    "  short factual question.",
    `- Use the command word "${command}" (or a close natural variant of it).`,
    `- Set it in the context of ${context}, worded naturally — don't force an awkward mention.`,
    "- It must be answerable from the syllabus content below, but must NOT be a copy or",
    "  close paraphrase of any single worked example already in that material — invent a",
    "  fresh, specific scenario the way a real paper-writer varies each year's paper.",
    "- End the question with the mark allocation in brackets, e.g. '[12]'.",
    options.excludeQuestions && options.excludeQuestions.length > 0
      ? `- Must be meaningfully different from these already-used questions:\n  - ${options.excludeQuestions.slice(-15).join("\n  - ")}`
      : "",
    "",
    sources.length > 0 ? renderContext(sources) : "",
    "",
    CONTRACT,
  ]
    .filter(Boolean)
    .join("\n");

  const userMessage = `Topic: ${options.topic}\nTariff: ${maxMark} marks`;

  const result = await chat({
    model: MODEL_QUESTION_GEN,
    temperature: 0.8,
    json: true,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const raw = extractFirstJsonObject(result.text);
  const question = String(raw?.question ?? "").trim();
  if (question.length < 10) {
    throw new Error("The AI could not write a valid essay question — try again.");
  }
  const rawMaxMark = Number(raw?.max_mark ?? maxMark);
  const finalMaxMark = ([8, 12, 20] as const).includes(rawMaxMark as 8 | 12 | 20)
    ? (rawMaxMark as 8 | 12 | 20)
    : maxMark;

  const generated: GeneratedEssayQuestion = {
    question,
    topic: String(raw?.topic ?? options.topic).trim() || options.topic,
    maxMark: finalMaxMark,
  };

  return { generated, meta: result };
}
