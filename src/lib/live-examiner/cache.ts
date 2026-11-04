import type { AoClassification, IssueV2 } from "./types";
import { issueDedupeKey } from "./anchoring";

export type CachedSentenceResult = {
  sentenceHash: string;
  ao: AoClassification | null;
  issues: IssueV2[];
  cachedAt: number;
};

export class LiveExaminerCache {
  private sentenceMap = new Map<string, CachedSentenceResult>();
  private dismissedKeys = new Set<string>();

  constructor(initialData?: {
    sentences?: Record<string, CachedSentenceResult>;
    dismissed?: string[];
  }) {
    if (initialData?.sentences) {
      for (const [hash, res] of Object.entries(initialData.sentences)) {
        this.sentenceMap.set(hash, res);
      }
    }
    if (initialData?.dismissed) {
      for (const key of initialData.dismissed) {
        this.dismissedKeys.add(key);
      }
    }
  }

  get(sentenceHash: string): CachedSentenceResult | undefined {
    return this.sentenceMap.get(sentenceHash);
  }

  set(sentenceHash: string, result: Omit<CachedSentenceResult, "cachedAt">): void {
    // Filter out dismissed issues before caching
    const filteredIssues = result.issues.filter(
      (iss) => !this.isDismissed(sentenceHash, iss.category, iss.original),
    );
    this.sentenceMap.set(sentenceHash, {
      ...result,
      issues: filteredIssues,
      cachedAt: Date.now(),
    });
  }

  has(sentenceHash: string): boolean {
    return this.sentenceMap.has(sentenceHash);
  }

  dismiss(sentenceHash: string, category: string, original: string): void {
    const key = issueDedupeKey(sentenceHash, category, original);
    this.dismissedKeys.add(key);

    // Also remove from any cached sentence entry
    const entry = this.sentenceMap.get(sentenceHash);
    if (entry) {
      entry.issues = entry.issues.filter(
        (iss) => issueDedupeKey(sentenceHash, iss.category, iss.original) !== key,
      );
    }
  }

  isDismissed(sentenceHash: string, category: string, original: string): boolean {
    return this.dismissedKeys.has(issueDedupeKey(sentenceHash, category, original));
  }

  clear(): void {
    this.sentenceMap.clear();
    this.dismissedKeys.clear();
  }

  toJSON(): {
    sentences: Record<string, CachedSentenceResult>;
    dismissed: string[];
  } {
    const sentences: Record<string, CachedSentenceResult> = {};
    for (const [hash, res] of this.sentenceMap.entries()) {
      sentences[hash] = res;
    }
    return {
      sentences,
      dismissed: Array.from(this.dismissedKeys),
    };
  }
}
