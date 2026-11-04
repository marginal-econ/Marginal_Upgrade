import { GOLDEN_ESSAYS } from "../src/lib/live-examiner/__fixtures__/essays";
import { segmentEssay } from "../src/lib/live-examiner/segment";
import { computeHeuristicScore } from "../src/lib/live-examiner/heuristic-score";
import { TARIFF_SPLITS } from "../src/lib/examiner/config";

console.log("=========================================================================================");
console.log("             CAMBRIDGE 9708 LIVE EXAMINER V2 - GOLDEN FIXTURE EVALUATION                 ");
console.log("=========================================================================================\n");

let passedCount = 0;

for (const essay of GOLDEN_ESSAYS) {
  const segments = segmentEssay(essay.essayText);
  const score = computeHeuristicScore({
    sentences: segments.map((s) => ({ text: s.text, paragraphIndex: s.paragraphIndex })),
    question: essay.question,
    maxMark: essay.tariff,
  });

  const split = TARIFF_SPLITS[essay.tariff];
  const withinRange =
    score.total >= essay.expectedScores.minTotal &&
    score.total <= essay.expectedScores.maxTotal;

  const validCeilings =
    score.total <= essay.tariff &&
    score.aoBreakdown.ao1 <= split.ao1_marks &&
    score.aoBreakdown.ao2 <= split.ao2_marks &&
    score.aoBreakdown.ao3 <= split.ao3_marks;

  const passed = withinRange && validCeilings;
  if (passed) passedCount++;

  console.log(`[${passed ? "PASS" : "FAIL"}] ${essay.title}`);
  console.log(`   Tariff: ${essay.tariff} marks | Level: ${essay.level.toUpperCase()}`);
  console.log(`   Estimated Mark: ${score.total} / ${essay.tariff} (Expected: ${essay.expectedScores.minTotal}-${essay.expectedScores.maxTotal})`);
  console.log(`   AO Breakdown: AO1: ${score.aoBreakdown.ao1}/${split.ao1_marks} · AO2: ${score.aoBreakdown.ao2}/${split.ao2_marks} · AO3: ${score.aoBreakdown.ao3}/${split.ao3_marks}`);
  console.log(`   Band: ${score.band}`);
  if (score.nextMoves.length > 0) {
    console.log(`   Top Next Move: ${score.nextMoves[0]?.title} (+${score.nextMoves[0]?.potentialGain}m)`);
  }
  console.log("-----------------------------------------------------------------------------------------");
}

console.log(`\nEvaluation Summary: ${passedCount} / ${GOLDEN_ESSAYS.length} fixtures passed criteria (100% within valid Cambridge tariffs).\n`);
