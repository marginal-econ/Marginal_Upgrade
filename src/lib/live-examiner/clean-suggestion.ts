/**
 * Sanitizes an examiner or grammar suggestion so it can be substituted
 * directly into the student's text without awkward prefixes, quotes, or meta-language.
 */
export function cleanSuggestion(raw: string | undefined | null): string {
  if (!raw) return "";
  let text = String(raw).trim();

  // Strip common conversational / exemplar lead-ins:
  // e.g., "e.g. higher costs", "eg: higher costs", "for example, higher costs", "like higher costs"
  text = text.replace(/^(?:e\.?g\.?|eg|for example|i\.?e\.?|ie|ex\.?|like)\s*[:,-]?\s*/i, "");

  // Strip action/command lead-ins:
  // e.g., "Use: higher costs", "Change to: higher costs", "Consider: higher costs", "Replace with: higher costs"
  text = text.replace(/^(?:use|change to|replace with|consider using|consider|try|write)\s*[:,-]?\s*/i, "");
  text = text.replace(/^(?:suggestion|revision|fix)\s*[:,-]?\s*/i, "");

  // Strip leading and trailing quotes if wrapped: e.g. "higher costs" -> higher costs
  text = text.replace(/^["'“‘`]+(.*?)["'”’`]+$/s, "$1").trim();

  // Strip trailing "instead" or "as well"
  text = text.replace(/\s+(?:instead|as well)\.?$/i, "");

  // Re-run lead-in check in case of nested e.g. "e.g. 'higher costs'"
  text = text.replace(/^(?:e\.?g\.?|eg|for example|like)\s*[:,-]?\s*/i, "");
  text = text.replace(/^["'“‘`]+(.*?)["'”’`]+$/s, "$1").trim();

  return text;
}
