# Live Examiner v2: Architectural Decisions

## Decision 1: Editor Engine — CodeMirror 6 over Textarea/ProseMirror
- **Context:** The legacy implementation used a `<textarea>` with an absolutely-positioned mirrored `<div>` behind/above it with `<mark>` elements. Scroll syncing, word-wrapping discrepancies, mobile soft-keyboards, and zoom caused chronic highlight drift.
- **Decision:** Use CodeMirror 6 (`@codemirror/state`, `@codemirror/view`, `@codemirror/commands`, `@codemirror/language`).
- **Rationale:** CodeMirror 6 is lightweight, uses immutable `EditorState` with atomic `Transaction`s, maps position offsets accurately across arbitrary edits with `ChangeSet.mapPos`, provides standard `Decoration.mark` and `Decoration.line` for gutter and text styling, and handles large documents (3,000+ words) effortlessly at 60fps.

## Decision 2: Pure Offset-Anchored Model with Rebase & Sentence ID
- **Context:** Legacy issues used string matching (`category::context::original`), which broke on duplicate words, typing above an annotation, or partial edits.
- **Decision:** Every annotation is anchored by `[from, to]` offsets plus `sentenceId` (hash of normalized sentence text + occurrence index). Offsets are remapped through transaction changesets. Server results tagged with `docVersion` are rebased against client changeset history; if text does not match `original`, the annotation is silently discarded instead of guessing.

## Decision 3: Three-Tier Feedback Pipeline (Layer A / B / C)
- **Layer A (Synchronous, Local < 50ms):** en-GB spellcheck (via `nspell` + `dictionary-en-gb` + whitelisted economics glossary terms) and high-precision grammar rules run on every keystroke. Heuristic structure signals produce an instant provisional mark.
- **Layer B (Fast AI Pass, Streamed <= 1.5s):** Asynchronous sentence classification (AO1, AO2, AO3, No Credit) and issue detection for dirty sentences using Gemini 3.8 Flash (`MODEL_FAST`). Streams sentence results.
- **Layer C (Deep Examiner Check, User or Idle >= 20s):** Full marking pipeline with rubric and audit pass that confirms/reconciles the live score.

## Decision 4: Authoritative Cambridge 9708 Tariff Splits
- **Source of truth:** `src/lib/examiner/config.ts`.
- Tariff 8: AO1: 2, AO2: 4, AO3: 2
- Tariff 12: AO1: 2, AO2: 6, AO3: 4
- Tariff 20: AO1: 2, AO2: 12, AO3: 6
- Live predicted mark scores are strictly clamped both server-side and client-side to never exceed AO or total tariffs.

## Decision 5: Non-Destructive Additive Database Migration
- Migration adds `sentence_cache jsonb`, `score_history jsonb`, `doc_version int`, and `schema_version int default 2` to `public.live_examiner_sessions`.
- Preserves all v1 session data without breaking existing schema or client sessions.

## Decision 6: Single Source Live Mark Widget & UI Deduplication
- **Context:** The right-hand column previously showed both `<ScoreWidget />` (the top predicted mark card with tariff bars, words indicator, and delta chips) and `<PredictedMarkCard />` inside `<LiveExaminerPanel />` (the bottom running mark card), causing confusing double scoring in the UI.
- **Decision:** Deduplicated the live mark interface. During active writing, only the user's preferred `<ScoreWidget />` is displayed. `<PredictedMarkCard />` is now conditionally shown only when official grading completes (`finalGrading !== null`).
- **Score Maximizer Integration:** Embedded the "Maximise Score Blueprint" action directly into `<NextMarks />` and the top action bar so students can seamlessly upgrade their draft to full marks without card clutter.

## Decision 7: Model Adaptation (Mistral & Gemini) & Universal Formatting Scrubbing
- **Mistral Adaptations:** Configured explicit system instructions forbidding markdown code fences (```json), conversational pleasantries, and markdown asterisks (`*` and `**`).
- **Universal Asterisk Scrubbing:** Implemented aggressive, recursive sanitization across all layers (`cleanStars`, `stripStars`, `cleanSuggestion`). All `explanation`, `evidence`, `original`, `suggestion`, `insertAfter`, `aoImpact`, and `headline` strings are thoroughly stripped of bold/italic asterisks, backticks, audit tags, and awkward command lead-ins (`Use:`, `e.g.`, `Suggestion:`) before reaching the UI or cache.

