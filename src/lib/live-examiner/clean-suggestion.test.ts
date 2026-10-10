import { describe, it, expect } from "vitest";
import { cleanSuggestion } from "./clean-suggestion";

describe("cleanSuggestion", () => {
  it("removes e.g. prefixes", () => {
    expect(cleanSuggestion("e.g. suppliers are less incentivised")).toBe("suppliers are less incentivised");
    expect(cleanSuggestion("e.g., higher prices")).toBe("higher prices");
    expect(cleanSuggestion("eg: lower demand")).toBe("lower demand");
    expect(cleanSuggestion("like eg higher costs")).toBe("higher costs");
  });

  it("removes for example / use / consider prefixes", () => {
    expect(cleanSuggestion("for example, demand falls")).toBe("demand falls");
    expect(cleanSuggestion("Use 'demerit goods' instead")).toBe("demerit goods");
    expect(cleanSuggestion("Change to: contraction in demand")).toBe("contraction in demand");
    expect(cleanSuggestion("Consider: negative externalities")).toBe("negative externalities");
  });

  it("strips outer quotes", () => {
    expect(cleanSuggestion('"demerit goods"')).toBe("demerit goods");
    expect(cleanSuggestion("'because'")).toBe("because");
    expect(cleanSuggestion("e.g. 'information failure'")).toBe("information failure");
  });

  it("leaves already clean text intact", () => {
    expect(cleanSuggestion("because")).toBe("because");
    expect(cleanSuggestion("suppliers")).toBe("suppliers");
    expect(cleanSuggestion("Demerit goods")).toBe("Demerit goods");
  });

  it("handles null / undefined safely", () => {
    expect(cleanSuggestion(null)).toBe("");
    expect(cleanSuggestion(undefined)).toBe("");
    expect(cleanSuggestion("")).toBe("");
  });
});
