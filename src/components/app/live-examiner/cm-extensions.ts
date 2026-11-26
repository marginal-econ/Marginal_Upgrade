import {
  EditorView,
  Decoration,
  type DecorationSet,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { StateField, StateEffect, type Range } from "@codemirror/state";
import type { IssueV2, SentenceSpan, AoTag } from "@/lib/live-examiner/types";

// ============================================================================
// State Effects for dynamic updates
// ============================================================================
export const setAnnotationsEffect = StateEffect.define<{
  sentences: SentenceSpan[];
  issues: IssueV2[];
  showAo: boolean;
  showIssues: boolean;
}>();

export const setHoveredSpanEffect = StateEffect.define<string | null>();

// ============================================================================
// Theme Definition for Calm, Comfortable Essay Writing (~17px, 1.88 line height)
// ============================================================================
export const essayEditorTheme = EditorView.theme(
  {
    "&": {
      fontSize: "17px",
      lineHeight: "1.88",
      fontFamily: "var(--font-serif, Georgia, serif)",
      color: "var(--foreground)",
      backgroundColor: "transparent",
      outline: "none",
      height: "100%",
    },
    ".cm-content": {
      maxWidth: "100%",
      padding: "24px 32px 80px 32px",
      caretColor: "var(--primary)",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    },
    ".cm-line": {
      padding: "0",
    },
    ".cm-cursor": {
      borderLeftColor: "var(--primary)",
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
      backgroundColor: "oklch(0.545 0.185 295 / 20%) !important",
    },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily: "inherit",
    },

    // AO Tints & Bottom Markers (editorial, calm, multi-line safe)
    ".cm-ao-ao1": {
      backgroundColor: "oklch(0.575 0.125 228 / 10%)",
      borderBottom: "1.5px solid oklch(0.575 0.125 228 / 52%)",
      borderRadius: "3px",
      padding: "2px 1px",
      boxDecorationBreak: "clone",
      WebkitBoxDecorationBreak: "clone",
      transition: "background-color 150ms ease, border-color 150ms ease",
      cursor: "pointer",
    },
    ".cm-ao-ao1:hover": {
      backgroundColor: "oklch(0.575 0.125 228 / 18%)",
      borderBottomColor: "oklch(0.575 0.125 228 / 78%)",
    },
    ".cm-ao-ao2": {
      backgroundColor: "oklch(0.53 0.115 168 / 10%)",
      borderBottom: "1.5px solid oklch(0.53 0.115 168 / 50%)",
      borderRadius: "3px",
      padding: "2px 1px",
      boxDecorationBreak: "clone",
      WebkitBoxDecorationBreak: "clone",
      transition: "background-color 150ms ease, border-color 150ms ease",
      cursor: "pointer",
    },
    ".cm-ao-ao2:hover": {
      backgroundColor: "oklch(0.53 0.115 168 / 18%)",
      borderBottomColor: "oklch(0.53 0.115 168 / 76%)",
    },
    ".cm-ao-ao3": {
      backgroundColor: "oklch(0.63 0.145 58 / 11%)",
      borderBottom: "1.5px solid oklch(0.63 0.145 58 / 58%)",
      borderRadius: "3px",
      padding: "2px 1px",
      boxDecorationBreak: "clone",
      WebkitBoxDecorationBreak: "clone",
      transition: "background-color 150ms ease, border-color 150ms ease",
      cursor: "pointer",
    },
    ".cm-ao-ao3:hover": {
      backgroundColor: "oklch(0.63 0.145 58 / 20%)",
      borderBottomColor: "oklch(0.63 0.145 58 / 82%)",
    },
    ".cm-ao-no-credit": {
      backgroundColor: "transparent",
      borderBottom: "none",
    },
    ".cm-ao-provisional": {
      opacity: "0.88",
    },

    // Distinct Issue Underlines: Economics errors (rose) vs Grammar/Spelling (indigo)
    ".cm-issue": {
      textDecoration: "underline wavy oklch(0.55 0.22 25 / 95%)",
      textUnderlineOffset: "4px",
      textDecorationThickness: "1.75px",
      cursor: "pointer",
    },
    ".cm-issue-mech": {
      textDecoration: "underline wavy oklch(0.54 0.19 265 / 90%)",
      textUnderlineOffset: "4px",
      textDecorationThickness: "1.6px",
      cursor: "pointer",
    },
    ".cm-issue:hover": {
      backgroundColor: "oklch(0.55 0.22 25 / 10%)",
      borderRadius: "2px",
    },
    ".cm-issue-mech:hover": {
      backgroundColor: "oklch(0.54 0.19 265 / 10%)",
      borderRadius: "2px",
    },
    ".cm-issue-stale": {
      opacity: "0.5",
      transition: "opacity 1000ms ease",
    },
    ".cm-issue-focused": {
      outline: "2px solid var(--primary)",
      borderRadius: "2px",
    },
  },
  { dark: false },
);

// ============================================================================
// StateField for Combined AO and Issue Decorations
// ============================================================================
export const annotationsField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    // 1. Map existing decorations through user edits
    decorations = decorations.map(tr.changes);

    // 2. Check for newly delivered annotations
    for (const effect of tr.effects) {
      if (effect.is(setAnnotationsEffect)) {
        const { sentences, issues, showAo, showIssues } = effect.value;
        const widgets: Range<Decoration>[] = [];
        const docLength = tr.newDoc.length;

        // Add AO Sentence marks if enabled
        if (showAo) {
          for (const s of sentences) {
            if (s.from >= s.to || s.to > docLength || !s.ao) continue;
            let aoClass = "cm-ao-no-credit";
            if (s.ao.tag === "ao1") aoClass = "cm-ao-ao1";
            else if (s.ao.tag === "ao2") aoClass = "cm-ao-ao2";
            else if (s.ao.tag === "ao3") aoClass = "cm-ao-ao3";

            if (s.ao.isProvisional) {
              aoClass += " cm-ao-provisional";
            }

            widgets.push(
              Decoration.mark({
                class: aoClass,
                attributes: {
                  "data-sentence-id": s.id,
                  "data-ao-tag": s.ao.tag,
                },
              }).range(s.from, s.to),
            );
          }
        }

        // Add Issue underlines if enabled (economics = rose wavy, grammar/spelling = indigo wavy)
        if (showIssues) {
          const MECH_CATS = new Set(["spelling", "grammar", "punctuation", "clarity"]);
          for (const iss of issues) {
            if (iss.from >= iss.to || iss.to > docLength || iss.status !== "active") continue;

            let issueClass = MECH_CATS.has(iss.category) ? "cm-issue-mech" : "cm-issue";
            if (iss.isStale) {
              issueClass += " cm-issue-stale";
            }

            widgets.push(
              Decoration.mark({
                class: issueClass,
                attributes: {
                  "data-issue-id": iss.id,
                  "data-category": iss.category,
                },
              }).range(iss.from, iss.to),
            );
          }
        }

        // Sort widgets in ascending order
        widgets.sort((a, b) => a.from - b.from || a.to - b.to);
        return Decoration.set(widgets, true);
      }
    }

    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ============================================================================
// Hover/Click Plugin: Coordinates target bounding rect for React Floating Card
// ============================================================================
export type HoverTarget = {
  issueId?: string;
  sentenceId?: string;
  rect: { left: number; top: number; right: number; bottom: number; width: number; height: number };
};

export function createInteractionPlugin(
  onHoverTarget: (target: HoverTarget | null) => void,
) {
  return ViewPlugin.fromClass(
    class {
      private timer: number | null = null;

      constructor(readonly view: EditorView) {}

      handleHover(event: MouseEvent, isClick = false) {
        const target = event.target as HTMLElement | null;
        if (!target) return;

        const issueEl = target.closest("[data-issue-id]") as HTMLElement | null;
        const sentenceEl = target.closest("[data-sentence-id]") as HTMLElement | null;
        if (issueEl) {
          const issueId = issueEl.getAttribute("data-issue-id") || undefined;
          const sentenceId = sentenceEl?.getAttribute("data-sentence-id") || undefined;
          const rect = issueEl.getBoundingClientRect();
          onHoverTarget({
            issueId,
            sentenceId,
            rect,
          });
          return;
        }

        // Clicking an AO-highlighted sentence opens its verified AO explanation card
        if (isClick && sentenceEl) {
          const aoTag = sentenceEl.getAttribute("data-ao-tag");
          if (aoTag && aoTag !== "no_credit") {
            const sentenceId = sentenceEl.getAttribute("data-sentence-id") || undefined;
            const rect = sentenceEl.getBoundingClientRect();
            onHoverTarget({
              sentenceId,
              rect,
            });
            return;
          }
        }

        if (isClick) {
          onHoverTarget(null);
        }
      }

      destroy() {
        if (this.timer) window.clearTimeout(this.timer);
      }
    },
    {
      eventHandlers: {
        mouseover(event) {
          this.handleHover(event, false);
        },
        click(event) {
          this.handleHover(event, true);
        },
      },
    },
  );
}
