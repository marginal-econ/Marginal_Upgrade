export type QuizLetter = "A" | "B" | "C" | "D";
export type QuizLevel = "as" | "a2";
export type QuizSourceType = "library_paper" | "topical_paper" | "custom_questions";
export type QuizGameStatus = "lobby" | "in_progress" | "ended";
export type QuizGameMode = "live_race" | "exam_sprint";

export type CustomQuizQuestion = {
  number: number;
  stem: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: QuizLetter;
  explanation?: string;
  topic?: string;
};

/** Public version sent to students while a quiz is active (correct answers stripped). */
export type PublicCustomQuizQuestion = Omit<CustomQuizQuestion, "correctAnswer" | "explanation"> & {
  correctAnswer?: QuizLetter;
  explanation?: string;
};

export type QuizAnswerRecord = {
  selected: QuizLetter;
  correct: boolean;
  correctAnswer?: QuizLetter;
  points: number;
  elapsedSeconds: number;
  answeredAt: string;
};

export type QuizPlayer = {
  id: string;
  userId?: string | null;
  name: string;
  avatar: string;
  score: number;
  answeredCount: number;
  correctCount: number;
  currentStreak: number;
  bestStreak: number;
  currentQuestion: number;
  answers: Record<number, QuizAnswerRecord>;
  finished: boolean;
  finishedAt?: string | null;
  joinedAt: string;
  lastAnsweredAt?: string | null;
};

export type McqQuizMeta = {
  pin: string;
  title: string;
  hostUserId: string;
  hostName: string;
  sourceType: QuizSourceType;
  paperId: string | null;
  paperTitle: string;
  level: QuizLevel;
  qpUrl?: string | null;
  questionNumbers: number[];
  customQuestions?: CustomQuizQuestion[];
  gameMode: QuizGameMode;
  timeLimitSeconds: number | null;
  showInstantFeedback: boolean;
  showLiveLeaderboard: boolean;
  status: QuizGameStatus;
  createdAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
};

export type PublicMcqQuizMeta = Omit<McqQuizMeta, "customQuestions"> & {
  customQuestions?: PublicCustomQuizQuestion[];
};

export type QuestionStatEntry = {
  attempted: number;
  correct: number;
  optionCounts: Record<QuizLetter, number>;
};

export type McqQuizPublicState = {
  meta: PublicMcqQuizMeta;
  players: QuizPlayer[];
  questionStats: Record<number, QuestionStatEntry>;
  isHost: boolean;
};

export type QuizScoreBreakdown = {
  points: number;
  base: number;
  speedBonus: number;
  streakBonus: number;
};

export const QUIZ_AVATARS = [
  { emoji: "🚀", label: "Rocket" },
  { emoji: "🦊", label: "Fox" },
  { emoji: "🦁", label: "Lion" },
  { emoji: "🐼", label: "Panda" },
  { emoji: "🦉", label: "Owl" },
  { emoji: "🐉", label: "Dragon" },
  { emoji: "🦄", label: "Unicorn" },
  { emoji: "🐸", label: "Frog" },
  { emoji: "⚡", label: "Bolt" },
  { emoji: "🎯", label: "Bullseye" },
  { emoji: "🏆", label: "Trophy" },
  { emoji: "💎", label: "Diamond" },
  { emoji: "🧠", label: "Brain" },
  { emoji: "🔥", label: "Flame" },
  { emoji: "🐧", label: "Penguin" },
  { emoji: "🐙", label: "Octopus" },
] as const;

export function normalizeQuizPin(raw: string): string {
  return raw.replace(/[^0-9]/g, "").slice(0, 6);
}

export function formatQuizPin(pin: string): string {
  const clean = normalizeQuizPin(pin);
  if (clean.length === 6) {
    return `${clean.slice(0, 3)} ${clean.slice(3)}`;
  }
  return clean;
}

/**
 * Gamified Blooket/Quizizz point calculation:
 * - Correct answer earns 100 base points.
 * - Live Race mode adds up to +50 speed bonus (decays smoothly over 60 seconds)
 *   plus +20 per active consecutive streak (capped at 10x = +200).
 * - Exam Sprint mode prioritizes accuracy (100 base + modest +10 streak bonus).
 */
export function calculateQuizPoints(input: {
  isCorrect: boolean;
  elapsedSeconds: number;
  currentStreak: number;
  gameMode: QuizGameMode;
}): QuizScoreBreakdown {
  if (!input.isCorrect) {
    return { points: 0, base: 0, speedBonus: 0, streakBonus: 0 };
  }

  const base = 100;
  const clampedSeconds = Math.max(0, Math.min(120, Number.isFinite(input.elapsedSeconds) ? input.elapsedSeconds : 30));
  const nextStreak = Math.max(0, input.currentStreak) + 1;

  if (input.gameMode === "exam_sprint") {
    const streakBonus = Math.min(nextStreak - 1, 10) * 10;
    return {
      points: base + streakBonus,
      base,
      speedBonus: 0,
      streakBonus,
    };
  }

  // Live Race mode (Quizizz/Blooket style)
  const speedRatio = Math.max(0, 1 - clampedSeconds / 60);
  const speedBonus = Math.round(50 * speedRatio);
  const streakBonus = Math.min(nextStreak - 1, 10) * 20;

  return {
    points: base + speedBonus + streakBonus,
    base,
    speedBonus,
    streakBonus,
  };
}

/** Deterministic leaderboard ranking: score desc -> correctCount desc -> finished first -> joined first. */
export function sortQuizLeaderboard(players: QuizPlayer[]): QuizPlayer[] {
  return [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    if (a.finishedAt && b.finishedAt && a.finishedAt !== b.finishedAt) {
      return a.finishedAt < b.finishedAt ? -1 : 1;
    }
    return a.joinedAt < b.joinedAt ? -1 : 1;
  });
}

/** Builds live per-question accuracy & option distribution heatmap for the Host Dashboard. */
export function computeQuizQuestionStats(
  players: QuizPlayer[],
  questionNumbers: number[],
): Record<number, QuestionStatEntry> {
  const stats: Record<number, QuestionStatEntry> = {};
  for (const num of questionNumbers) {
    stats[num] = {
      attempted: 0,
      correct: 0,
      optionCounts: { A: 0, B: 0, C: 0, D: 0 },
    };
  }

  for (const player of players) {
    for (const [numStr, rec] of Object.entries(player.answers ?? {})) {
      const qNum = Number(numStr);
      if (!stats[qNum]) {
        stats[qNum] = {
          attempted: 0,
          correct: 0,
          optionCounts: { A: 0, B: 0, C: 0, D: 0 },
        };
      }
      stats[qNum].attempted += 1;
      if (rec.correct) stats[qNum].correct += 1;
      if (rec.selected && stats[qNum].optionCounts[rec.selected] !== undefined) {
        stats[qNum].optionCounts[rec.selected] += 1;
      }
    }
  }

  return stats;
}

/** Exports finished class results as clean CSV for a teacher's gradebook. */
export function buildQuizResultsCsv(meta: PublicMcqQuizMeta, players: QuizPlayer[]): string {
  const sorted = sortQuizLeaderboard(players);
  const totalQ = Math.max(1, meta.questionNumbers.length);
  const escape = (val: string | number) => {
    const str = String(val ?? "");
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const headers = [
    "Rank",
    "Student Name",
    "Score (pts)",
    "Correct",
    "Attempted",
    "Total Questions",
    "Accuracy (%)",
    "Best Streak",
    "Status",
  ];
  const rows = sorted.map((p, idx) => {
    const acc = p.answeredCount > 0 ? Math.round((p.correctCount / totalQ) * 100) : 0;
    return [
      idx + 1,
      p.name,
      p.score,
      p.correctCount,
      p.answeredCount,
      totalQ,
      `${acc}%`,
      p.bestStreak,
      p.finished ? "Finished" : "In Progress",
    ]
      .map(escape)
      .join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}
