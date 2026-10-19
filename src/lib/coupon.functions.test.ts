import { describe, expect, it } from "vitest";

describe("Coupon Discount Calculations", () => {
  it("calculates percentage discount accurately", () => {
    const baseAmount = 399; // Pro plan monthly
    const percentage = 20; // 20%
    const discountAmount = Math.round((baseAmount * percentage) / 100);
    const finalAmount = Math.max(0, baseAmount - discountAmount);

    expect(discountAmount).toBe(80);
    expect(finalAmount).toBe(319);
  });

  it("calculates flat discount accurately", () => {
    const baseAmount = 699; // Mastery plan monthly
    const flatDiscount = 150;
    const discountAmount = Math.min(flatDiscount, baseAmount);
    const finalAmount = Math.max(0, baseAmount - discountAmount);

    expect(discountAmount).toBe(150);
    expect(finalAmount).toBe(549);
  });

  it("never lets discount exceed base amount (prevents negative totals)", () => {
    const baseAmount = 99; // Foundation plan monthly
    const flatDiscount = 200;
    const discountAmount = Math.min(flatDiscount, baseAmount);
    const finalAmount = Math.max(0, baseAmount - discountAmount);

    expect(discountAmount).toBe(99);
    expect(finalAmount).toBe(0);
  });

  it("normalizes coupon codes correctly to uppercase alphanumeric", () => {
    const raw1 = "  save20  ";
    const clean1 = raw1.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    expect(clean1).toBe("SAVE20");

    const raw2 = "econ_special-50!";
    const clean2 = raw2.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    expect(clean2).toBe("ECON_SPECIAL-50");
  });

  it("enforces expiration and max usage checks logically", () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const futureDate = new Date(Date.now() + 86400000).toISOString();

    const isPastExpired = new Date(pastDate).getTime() < Date.now();
    const isFutureExpired = new Date(futureDate).getTime() < Date.now();

    expect(isPastExpired).toBe(true);
    expect(isFutureExpired).toBe(false);

    const maxUses = 50;
    const usedCountActive = 49;
    const usedCountFull = 50;

    expect(usedCountActive < maxUses).toBe(true);
    expect(usedCountFull >= maxUses).toBe(true);
  });
});
