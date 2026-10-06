import { describe, expect, it } from "vitest";
import {
  LIVE_EXAMINER_DURATION_MINUTES,
  DEFAULT_LIVE_EXAMINER_DURATION_MINUTES,
  LIVE_EXAMINER_DAILY_LIMIT,
} from "@/lib/usage-limits";

describe("Live Examiner Session Duration & Limits", () => {
  it("defines appropriate duration limits per price tier", () => {
    // Foundation tier: 30 minutes timed drill
    expect(LIVE_EXAMINER_DURATION_MINUTES.foundation).toBe(30);

    // Pro tier: 45 minutes official Cambridge 9708 exam timing
    expect(LIVE_EXAMINER_DURATION_MINUTES.pro).toBe(45);

    // Mastery tier: 60 minutes extended revision
    expect(LIVE_EXAMINER_DURATION_MINUTES.mastery).toBe(60);

    // Elite tier: 90 minutes sprint revision
    expect(LIVE_EXAMINER_DURATION_MINUTES.elite).toBe(90);
  });

  it("defaults to official Cambridge 45-minute exam duration", () => {
    expect(DEFAULT_LIVE_EXAMINER_DURATION_MINUTES).toBe(45);
  });

  it("enforces daily question session limits", () => {
    expect(LIVE_EXAMINER_DAILY_LIMIT).toBe(1);
  });

  it("computes countdown seconds correctly", () => {
    const durationMinutes = LIVE_EXAMINER_DURATION_MINUTES.pro;
    const durationSeconds = durationMinutes * 60;
    expect(durationSeconds).toBe(2700);

    // Elapsed 10 minutes (600s)
    const elapsedSeconds = 600;
    const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
    expect(remainingSeconds).toBe(2100);

    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    const formatted = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    expect(formatted).toBe("35:00");

    // Elapsed past duration (2800s) -> expired
    const expiredElapsed = 2800;
    const expiredRemaining = Math.max(0, durationSeconds - expiredElapsed);
    expect(expiredRemaining).toBe(0);
    const isExpired = expiredRemaining <= 0;
    expect(isExpired).toBe(true);
  });
});
