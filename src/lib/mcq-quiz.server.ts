import { supabaseAdmin } from "@/integrations/backend/client.server";
import { isMarginalAdmin } from "@/lib/auth-admin";
import { getStoredPaperExplanationsServer, type McqExplanationResult } from "@/lib/mcq/mcq-pdf.server";
import { getTopicalPaperById } from "@/lib/topical-mcq-papers";
import {
  calculateQuizPoints,
  computeQuizQuestionStats,
  normalizeQuizPin,
  sortQuizLeaderboard,
  type CustomQuizQuestion,
  type McqQuizMeta,
  type McqQuizPublicState,
  type PublicCustomQuizQuestion,
  type PublicMcqQuizMeta,
  type QuizGameMode,
  type QuizLetter,
  type QuizLevel,
  type QuizPlayer,
  type QuizSourceType,
} from "./mcq-quiz.types";

const META_PREFIX = "__MCQ_QUIZ_META_";
const PLAYER_PREFIX = "__MCQ_QUIZ_PLAYER_";

function metaKey(pin: string) {
  return `${META_PREFIX}${pin}`;
}

function playerPrefix(pin: string) {
  return `${PLAYER_PREFIX}${pin}_`;
}

function playerKey(pin: string, playerId: string) {
  return `${PLAYER_PREFIX}${pin}_${playerId}`;
}

const QUIZ_STORE = {
  async get<T>(term: string): Promise<T | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from("definitions")
        .select("definition_text")
        .eq("term", term)
        .maybeSingle();
      if (error || !data?.definition_text) return null;
      return JSON.parse(data.definition_text) as T;
    } catch {
      return null;
    }
  },

  async list<T>(prefix: string): Promise<T[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from("definitions")
        .select("definition_text")
        .like("term", `${prefix}%`)
        .limit(500);
      if (error || !data) return [];
      const items: T[] = [];
      for (const row of data) {
        if (!row.definition_text) continue;
        try {
          items.push(JSON.parse(row.definition_text) as T);
        } catch {
          // ignore malformed row
        }
      }
      return items;
    } catch {
      return [];
    }
  },

  async set<T>(term: string, value: T): Promise<void> {
    const text = JSON.stringify(value);
    const { data: existing } = await supabaseAdmin
      .from("definitions")
      .select("id")
      .eq("term", term)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from("definitions")
        .update({
          definition_text: text,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw new Error(`Quiz storage update failed: ${error.message}`);
    } else {
      const { error } = await supabaseAdmin.from("definitions").insert({
        term,
        definition_text: text,
        category: "system_config",
      });
      if (error) throw new Error(`Quiz storage write failed: ${error.message}`);
    }
  },

  async remove(term: string): Promise<void> {
    await supabaseAdmin.from("definitions").delete().eq("term", term);
  },

  async removePrefix(prefix: string): Promise<void> {
    await supabaseAdmin.from("definitions").delete().like("term", `${prefix}%`);
  },
};

/** Generate a random 6-digit PIN without colliding with an existing live quiz. */
async function generateUniquePin(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const existing = await QUIZ_STORE.get<McqQuizMeta>(metaKey(pin));
    if (!existing) return pin;
  }
  return String(Date.now()).slice(-6);
}

function sanitizeMetaForViewer(meta: McqQuizMeta, isHost: boolean): PublicMcqQuizMeta {
  if (!meta.customQuestions) {
    return meta;
  }
  const revealAnswers = isHost || meta.status === "ended";
  const safeQuestions: PublicCustomQuizQuestion[] = meta.customQuestions.map((q) =>
    revealAnswers
      ? q
      : {
          number: q.number,
          stem: q.stem,
          options: q.options,
          topic: q.topic,
        },
  );
  return {
    ...meta,
    customQuestions: safeQuestions,
  };
}

function isHostAuthorized(
  meta: McqQuizMeta,
  user: { userId: string; email?: string; claims?: Record<string, unknown> },
): boolean {
  if (meta.hostUserId === user.userId) return true;
  return isMarginalAdmin({ userId: user.userId, email: user.email, claims: user.claims });
}

export type CreateMcqQuizInput = {
  title?: string;
  sourceType: QuizSourceType;
  paperId?: string | null;
  level?: QuizLevel;
  questionStart?: number;
  questionEnd?: number;
  customQuestions?: Omit<CustomQuizQuestion, "number">[];
  gameMode: QuizGameMode;
  timeLimitSeconds?: number | null;
  showInstantFeedback?: boolean;
  showLiveLeaderboard?: boolean;
};

export async function createMcqQuizServer(
  input: CreateMcqQuizInput,
  host: { userId: string; hostName: string },
): Promise<{ pin: string; meta: McqQuizMeta }> {
  let paperId: string | null = null;
  let paperTitle = input.title?.trim() || "Live MCQ Quiz";
  let level: QuizLevel = input.level ?? "as";
  let qpUrl: string | null = null;
  let questionNumbers: number[] = [];
  let customQuestions: CustomQuizQuestion[] | undefined;

  if (input.sourceType === "library_paper") {
    if (!input.paperId) throw new Error("Please select a past paper.");
    const { data: paper, error } = await supabaseAdmin
      .from("mcq_pdf_papers")
      .select("id, title, level, question_count, qp_url, answer_key")
      .eq("id", input.paperId)
      .maybeSingle();

    if (error || !paper) {
      throw new Error("That past paper could not be found in the library.");
    }
    paperId = paper.id;
    paperTitle = paper.title;
    level = paper.level === "a2" ? "a2" : "as";
    qpUrl = paper.qp_url;

    const total = Math.max(1, paper.question_count || 30);
    const start = Math.max(1, Math.min(total, input.questionStart ?? 1));
    const end = Math.max(start, Math.min(total, input.questionEnd ?? total));
    questionNumbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  } else if (input.sourceType === "topical_paper") {
    if (!input.paperId) throw new Error("Please select a topical past paper.");
    const topical = getTopicalPaperById(input.paperId);
    if (!topical) {
      throw new Error("That topical paper could not be found.");
    }
    paperId = topical.id;
    paperTitle = topical.title;
    level = topical.level;
    qpUrl = null;

    const total = Math.max(1, topical.questionCount || topical.questions.length);
    const start = Math.max(1, Math.min(total, input.questionStart ?? 1));
    const end = Math.max(start, Math.min(total, input.questionEnd ?? total));
    questionNumbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  } else {
    const rawQs = input.customQuestions ?? [];
    if (rawQs.length === 0) {
      throw new Error("Add at least 1 question to create a custom MCQ quiz.");
    }
    customQuestions = rawQs.map((q, idx) => ({
      number: idx + 1,
      stem: q.stem.trim(),
      options: {
        A: q.options.A.trim(),
        B: q.options.B.trim(),
        C: q.options.C.trim(),
        D: q.options.D.trim(),
      },
      correctAnswer: q.correctAnswer,
      explanation: q.explanation?.trim() || undefined,
      topic: q.topic?.trim() || undefined,
    }));
    questionNumbers = customQuestions.map((q) => q.number);
    paperTitle = input.title?.trim() || `Custom MCQ Paper (${customQuestions.length} Questions)`;
  }

  const pin = await generateUniquePin();
  const meta: McqQuizMeta = {
    pin,
    title: input.title?.trim() || paperTitle,
    hostUserId: host.userId,
    hostName: host.hostName || "Teacher",
    sourceType: input.sourceType,
    paperId,
    paperTitle,
    level,
    qpUrl,
    questionNumbers,
    customQuestions,
    gameMode: input.gameMode,
    timeLimitSeconds: input.timeLimitSeconds && input.timeLimitSeconds > 0 ? input.timeLimitSeconds : null,
    showInstantFeedback: input.showInstantFeedback ?? true,
    showLiveLeaderboard: input.showLiveLeaderboard ?? true,
    status: "lobby",
    createdAt: new Date().toISOString(),
    startedAt: null,
    endedAt: null,
  };

  await QUIZ_STORE.set(metaKey(pin), meta);
  return { pin, meta };
}

export async function getMcqQuizStateServer(
  rawPin: string,
  viewer?: { userId?: string | null; email?: string; claims?: Record<string, unknown> },
): Promise<McqQuizPublicState | null> {
  const pin = normalizeQuizPin(rawPin);
  if (pin.length !== 6) return null;

  const meta = await QUIZ_STORE.get<McqQuizMeta>(metaKey(pin));
  if (!meta) return null;

  const rawPlayers = await QUIZ_STORE.list<QuizPlayer>(playerPrefix(pin));
  const players = sortQuizLeaderboard(rawPlayers);
  const questionStats = computeQuizQuestionStats(players, meta.questionNumbers);

  const isHost = Boolean(
    viewer?.userId &&
      isHostAuthorized(meta, {
        userId: viewer.userId,
        email: viewer.email,
        claims: viewer.claims,
      }),
  );

  return {
    meta: sanitizeMetaForViewer(meta, isHost),
    players,
    questionStats,
    isHost,
  };
}

export async function joinMcqQuizServer(input: {
  pin: string;
  playerId?: string | null;
  userId?: string | null;
  name: string;
  avatar: string;
}): Promise<{ player: QuizPlayer; state: McqQuizPublicState }> {
  const pin = normalizeQuizPin(input.pin);
  const meta = await QUIZ_STORE.get<McqQuizMeta>(metaKey(pin));
  if (!meta) {
    throw new Error("No live quiz found with that PIN. Double-check the 6-digit code.");
  }
  if (meta.status === "ended") {
    throw new Error("This live quiz has already ended.");
  }

  const cleanName = input.name.trim().slice(0, 32);
  if (!cleanName) {
    throw new Error("Enter a nickname to join the quiz.");
  }

  // Re-use playerId if reconnecting (or userId-based deterministic id when signed in)
  const resolvedPlayerId =
    input.playerId?.trim() ||
    (input.userId ? `u_${input.userId}` : `g_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`);

  const existing = await QUIZ_STORE.get<QuizPlayer>(playerKey(pin, resolvedPlayerId));
  const now = new Date().toISOString();

  const player: QuizPlayer = existing
    ? {
        ...existing,
        name: cleanName,
        avatar: input.avatar || existing.avatar,
      }
    : {
        id: resolvedPlayerId,
        userId: input.userId ?? null,
        name: cleanName,
        avatar: input.avatar || "🚀",
        score: 0,
        answeredCount: 0,
        correctCount: 0,
        currentStreak: 0,
        bestStreak: 0,
        currentQuestion: meta.questionNumbers[0] ?? 1,
        answers: {},
        finished: false,
        finishedAt: null,
        joinedAt: now,
        lastAnsweredAt: null,
      };

  await QUIZ_STORE.set(playerKey(pin, resolvedPlayerId), player);

  const state = await getMcqQuizStateServer(pin, { userId: input.userId });
  if (!state) throw new Error("Failed to load live quiz session.");
  return { player, state };
}

export async function kickQuizPlayerServer(
  rawPin: string,
  host: { userId: string; email?: string; claims?: Record<string, unknown> },
  playerId: string,
): Promise<{ ok: true }> {
  const pin = normalizeQuizPin(rawPin);
  const meta = await QUIZ_STORE.get<McqQuizMeta>(metaKey(pin));
  if (!meta) throw new Error("Quiz not found.");
  if (!isHostAuthorized(meta, host)) {
    throw new Error("Only the quiz host can remove players.");
  }
  await QUIZ_STORE.remove(playerKey(pin, playerId));
  return { ok: true };
}

export async function startMcqQuizServer(
  rawPin: string,
  host: { userId: string; email?: string; claims?: Record<string, unknown> },
): Promise<McqQuizPublicState> {
  const pin = normalizeQuizPin(rawPin);
  const meta = await QUIZ_STORE.get<McqQuizMeta>(metaKey(pin));
  if (!meta) throw new Error("Quiz not found.");
  if (!isHostAuthorized(meta, host)) {
    throw new Error("Only the quiz host can start this quiz.");
  }

  const updated: McqQuizMeta = {
    ...meta,
    status: "in_progress",
    startedAt: meta.startedAt ?? new Date().toISOString(),
  };
  await QUIZ_STORE.set(metaKey(pin), updated);

  const state = await getMcqQuizStateServer(pin, host);
  if (!state) throw new Error("Failed to reload quiz state.");
  return state;
}

export async function endMcqQuizServer(
  rawPin: string,
  host: { userId: string; email?: string; claims?: Record<string, unknown> },
): Promise<McqQuizPublicState> {
  const pin = normalizeQuizPin(rawPin);
  const meta = await QUIZ_STORE.get<McqQuizMeta>(metaKey(pin));
  if (!meta) throw new Error("Quiz not found.");
  if (!isHostAuthorized(meta, host)) {
    throw new Error("Only the quiz host can end this quiz.");
  }

  const updated: McqQuizMeta = {
    ...meta,
    status: "ended",
    endedAt: new Date().toISOString(),
  };
  await QUIZ_STORE.set(metaKey(pin), updated);

  const state = await getMcqQuizStateServer(pin, host);
  if (!state) throw new Error("Failed to reload quiz state.");
  return state;
}

async function resolveCorrectAnswerForQuestion(
  meta: McqQuizMeta,
  questionNumber: number,
): Promise<{
  correctAnswer: QuizLetter | null;
  storedExplanation?: McqExplanationResult | null;
}> {
  if (meta.sourceType === "custom_questions") {
    const q = meta.customQuestions?.find((item) => item.number === questionNumber);
    return {
      correctAnswer: q?.correctAnswer ?? null,
      storedExplanation: q?.explanation ? { text: q.explanation } : null,
    };
  }

  if (meta.sourceType === "topical_paper" && meta.paperId) {
    const topical = getTopicalPaperById(meta.paperId);
    const key = topical?.answerKey?.[String(questionNumber)] ?? null;
    let storedExplanation: McqExplanationResult | null = null;
    if (meta.showInstantFeedback) {
      try {
        const stored = await getStoredPaperExplanationsServer(meta.paperId);
        storedExplanation = stored[questionNumber] ?? null;
      } catch {
        // ignore optional lookup error
      }
    }
    return { correctAnswer: (key as QuizLetter) ?? null, storedExplanation };
  }

  if (meta.sourceType === "library_paper" && meta.paperId) {
    const { data: paper } = await supabaseAdmin
      .from("mcq_pdf_papers")
      .select("answer_key, overlay")
      .eq("id", meta.paperId)
      .maybeSingle();

    const answerKey = (paper?.answer_key ?? {}) as Record<string, QuizLetter>;
    const correctAnswer = answerKey[String(questionNumber)] ?? null;
    const overlayExplanations = (paper?.overlay as Record<string, any> | null)?.explanations;
    const storedExplanation =
      meta.showInstantFeedback && overlayExplanations?.[String(questionNumber)]
        ? (overlayExplanations[String(questionNumber)] as McqExplanationResult)
        : null;
    return { correctAnswer, storedExplanation };
  }

  return { correctAnswer: null, storedExplanation: null };
}

export async function submitQuizAnswerServer(input: {
  pin: string;
  playerId: string;
  questionNumber: number;
  selectedLetter: QuizLetter;
  elapsedSeconds: number;
}): Promise<{
  isCorrect: boolean;
  correctAnswer: QuizLetter | null;
  pointsEarned: number;
  basePoints: number;
  speedBonus: number;
  streakBonus: number;
  player: QuizPlayer;
  rank: number;
  totalPlayers: number;
  explanation?: McqExplanationResult | null;
}> {
  const pin = normalizeQuizPin(input.pin);
  const meta = await QUIZ_STORE.get<McqQuizMeta>(metaKey(pin));
  if (!meta) throw new Error("Quiz not found.");
  if (meta.status === "lobby") {
    throw new Error("Wait for the host to start the quiz before submitting answers.");
  }
  if (meta.status === "ended") {
    throw new Error("This quiz has already ended.");
  }
  if (!meta.questionNumbers.includes(input.questionNumber)) {
    throw new Error("That question is not part of this quiz.");
  }

  const player = await QUIZ_STORE.get<QuizPlayer>(playerKey(pin, input.playerId));
  if (!player) {
    throw new Error("You are not registered in this quiz. Please rejoin.");
  }

  // Prevent double-scoring the same question
  if (player.answers[input.questionNumber]) {
    const existing = player.answers[input.questionNumber];
    const allPlayers = sortQuizLeaderboard(await QUIZ_STORE.list<QuizPlayer>(playerPrefix(pin)));
    const rank = Math.max(1, allPlayers.findIndex((p) => p.id === player.id) + 1);
    return {
      isCorrect: existing.correct,
      correctAnswer: meta.showInstantFeedback ? (existing.correctAnswer ?? null) : null,
      pointsEarned: existing.points,
      basePoints: existing.correct ? 100 : 0,
      speedBonus: 0,
      streakBonus: 0,
      player,
      rank,
      totalPlayers: allPlayers.length,
      explanation: null,
    };
  }

  const { correctAnswer, storedExplanation } = await resolveCorrectAnswerForQuestion(
    meta,
    input.questionNumber,
  );
  const isCorrect = correctAnswer !== null && input.selectedLetter === correctAnswer;

  const breakdown = calculateQuizPoints({
    isCorrect,
    elapsedSeconds: input.elapsedSeconds,
    currentStreak: player.currentStreak,
    gameMode: meta.gameMode,
  });

  const nextStreak = isCorrect ? player.currentStreak + 1 : 0;
  const bestStreak = Math.max(player.bestStreak, nextStreak);
  const now = new Date().toISOString();

  const updatedAnswers = {
    ...player.answers,
    [input.questionNumber]: {
      selected: input.selectedLetter,
      correct: isCorrect,
      correctAnswer: correctAnswer ?? undefined,
      points: breakdown.points,
      elapsedSeconds: Math.max(0, Math.round(input.elapsedSeconds)),
      answeredAt: now,
    },
  };

  const answeredCount = Object.keys(updatedAnswers).length;
  const correctCount = Object.values(updatedAnswers).filter((a) => a.correct).length;
  const finished = answeredCount >= meta.questionNumbers.length;

  // Next unanswered question number for progress tracking
  const nextUnanswered =
    meta.questionNumbers.find((n) => !updatedAnswers[n]) ??
    meta.questionNumbers[meta.questionNumbers.length - 1] ??
    input.questionNumber;

  const updatedPlayer: QuizPlayer = {
    ...player,
    score: player.score + breakdown.points,
    answeredCount,
    correctCount,
    currentStreak: nextStreak,
    bestStreak,
    currentQuestion: nextUnanswered,
    answers: updatedAnswers,
    finished,
    finishedAt: finished ? (player.finishedAt ?? now) : null,
    lastAnsweredAt: now,
  };

  await QUIZ_STORE.set(playerKey(pin, input.playerId), updatedPlayer);

  const allPlayers = sortQuizLeaderboard(await QUIZ_STORE.list<QuizPlayer>(playerPrefix(pin)));
  const rank = Math.max(1, allPlayers.findIndex((p) => p.id === updatedPlayer.id) + 1);

  return {
    isCorrect,
    correctAnswer: meta.showInstantFeedback ? correctAnswer : null,
    pointsEarned: breakdown.points,
    basePoints: breakdown.base,
    speedBonus: breakdown.speedBonus,
    streakBonus: breakdown.streakBonus,
    player: updatedPlayer,
    rank,
    totalPlayers: allPlayers.length,
    explanation: meta.showInstantFeedback ? storedExplanation : null,
  };
}

export async function finishQuizPlayerServer(
  rawPin: string,
  playerId: string,
): Promise<QuizPlayer> {
  const pin = normalizeQuizPin(rawPin);
  const player = await QUIZ_STORE.get<QuizPlayer>(playerKey(pin, playerId));
  if (!player) throw new Error("Player session not found.");

  const updated: QuizPlayer = {
    ...player,
    finished: true,
    finishedAt: player.finishedAt ?? new Date().toISOString(),
  };
  await QUIZ_STORE.set(playerKey(pin, playerId), updated);
  return updated;
}

export async function listMyHostedQuizzesServer(
  hostUserId: string,
): Promise<Array<PublicMcqQuizMeta & { playerCount: number }>> {
  const allMetas = await QUIZ_STORE.list<McqQuizMeta>(META_PREFIX);
  const mine = allMetas
    .filter((m) => m && m.hostUserId === hostUserId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 20);

  const enriched = await Promise.all(
    mine.map(async (m) => {
      const players = await QUIZ_STORE.list<QuizPlayer>(playerPrefix(m.pin));
      return {
        ...sanitizeMetaForViewer(m, true),
        playerCount: players.length,
      };
    }),
  );

  return enriched;
}

export async function deleteMcqQuizServer(
  rawPin: string,
  host: { userId: string; email?: string; claims?: Record<string, unknown> },
): Promise<{ ok: true }> {
  const pin = normalizeQuizPin(rawPin);
  const meta = await QUIZ_STORE.get<McqQuizMeta>(metaKey(pin));
  if (!meta) return { ok: true };
  if (!isHostAuthorized(meta, host)) {
    throw new Error("Only the quiz host can delete this quiz.");
  }
  await QUIZ_STORE.remove(metaKey(pin));
  await QUIZ_STORE.removePrefix(playerPrefix(pin));
  return { ok: true };
}

/**
 * Safely proxies a Cambridge PDF for guest/student participants of an active quiz,
 * strictly validating that the requested URL belongs to that quiz's paper.
 */
export async function fetchQuizPaperPdfServer(rawPin: string, targetUrl: string): Promise<{ base64: string }> {
  const pin = normalizeQuizPin(rawPin);
  const meta = await QUIZ_STORE.get<McqQuizMeta>(metaKey(pin));
  if (!meta) {
    throw new Error("Quiz not found.");
  }

  const allowedUrls = new Set<string>();
  if (meta.qpUrl) allowedUrls.add(meta.qpUrl);
  if (meta.sourceType === "topical_paper" && meta.paperId) {
    const topical = getTopicalPaperById(meta.paperId);
    for (const q of topical?.questions ?? []) {
      if (q.qpUrl) allowedUrls.add(q.qpUrl);
    }
  }

  if (!allowedUrls.has(targetUrl)) {
    throw new Error("That PDF URL does not belong to this quiz paper.");
  }

  const response = await fetch(targetUrl);
  if (!response.ok) {
    throw new Error(`Could not fetch quiz paper PDF (HTTP ${response.status}).`);
  }
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return { base64: btoa(binary) };
}
