import { describe, expect, it } from "vitest";
import { computeTotals, deliveryFeeFor, discountPercent, effectivePrice, evaluateCoupon, type CouponRule, type PricedLine } from "@/lib/pricing";

const fees = { standard: 150, express: 300, freeThreshold: 5000 };
const day = 86400_000;
const now = new Date("2026-10-28T12:00:00Z");
const coupon = (over: Partial<CouponRule> = {}): CouponRule => ({
  code: "EID20",
  shopId: "s1",
  type: "PERCENT",
  value: 20,
  minSpend: 0,
  startsAt: new Date(now.getTime() - day),
  endsAt: new Date(now.getTime() + day),
  usageLimit: 100,
  usedCount: 0,
  isActive: true,
  productIds: [],
  ...over,
});
const line = (over: Partial<PricedLine> = {}): PricedLine => ({ shopId: "s1", productId: "p1", variantId: "v1", unitPrice: 1000, quantity: 1, ...over });

describe("effectivePrice", () => {
  it("uses the sale price only when it is lower than the price", () => {
    expect(effectivePrice({ price: 4999, salePrice: 3499 })).toBe(3499);
    expect(effectivePrice({ price: 4999, salePrice: null })).toBe(4999);
    expect(effectivePrice({ price: 4999, salePrice: 5999 })).toBe(4999);
    expect(effectivePrice({ price: 4999, salePrice: 0 })).toBe(4999);
  });
  it("rounds the discount badge", () => {
    expect(discountPercent({ price: 4999, salePrice: 3499 })).toBe(30);
    expect(discountPercent({ price: 1000, salePrice: null })).toBe(0);
  });
});

describe("deliveryFeeFor", () => {
  it("is free above the threshold for standard delivery only", () => {
    expect(deliveryFeeFor(4999, "STANDARD", fees)).toBe(150);
    expect(deliveryFeeFor(5000, "STANDARD", fees)).toBe(0);
    expect(deliveryFeeFor(9000, "EXPRESS", fees)).toBe(300);
  });
});

describe("evaluateCoupon", () => {
  it("applies a percentage to eligible items, rounded down", () => {
    expect(evaluateCoupon(coupon(), [line({ unitPrice: 3499 })], now)).toEqual({ ok: true, discount: 699 });
  });
  it("caps a fixed discount at the eligible subtotal", () => {
    expect(evaluateCoupon(coupon({ type: "FIXED", value: 5000 }), [line({ unitPrice: 1200 })], now)).toEqual({ ok: true, discount: 1200 });
  });
  it("rejects expired, future, exhausted, inactive and under-minimum coupons", () => {
    const l = [line()];
    expect(evaluateCoupon(coupon({ endsAt: new Date(now.getTime() - 1) }), l, now).ok).toBe(false);
    expect(evaluateCoupon(coupon({ startsAt: new Date(now.getTime() + 1) }), l, now).ok).toBe(false);
    expect(evaluateCoupon(coupon({ usedCount: 100 }), l, now).ok).toBe(false);
    expect(evaluateCoupon(coupon({ isActive: false }), l, now).ok).toBe(false);
    expect(evaluateCoupon(coupon({ minSpend: 2000 }), l, now).ok).toBe(false);
  });
  it("only counts items from the coupon's shop and selected products", () => {
    const lines = [line({ unitPrice: 1000 }), line({ shopId: "s2", productId: "p9", unitPrice: 9000 }), line({ productId: "p2", unitPrice: 500 })];
    expect(evaluateCoupon(coupon(), lines, now)).toEqual({ ok: true, discount: 300 });
    expect(evaluateCoupon(coupon({ productIds: ["p2"] }), lines, now)).toEqual({ ok: true, discount: 100 });
    expect(evaluateCoupon(coupon({ shopId: "s3" }), lines, now).ok).toBe(false);
  });
});

describe("computeTotals (checkout totals)", () => {
  it("splits totals per shop and charges delivery per shop", () => {
    const t = computeTotals([line({ unitPrice: 3499 }), line({ shopId: "s2", productId: "p2", unitPrice: 1899, quantity: 2 })], { option: "STANDARD", fees, now });
    expect(t.shops).toEqual([
      { shopId: "s1", subtotal: 3499, discount: 0, deliveryFee: 150, total: 3649 },
      { shopId: "s2", subtotal: 3798, discount: 0, deliveryFee: 150, total: 3948 },
    ]);
    expect(t.total).toBe(3649 + 3948);
  });
  it("applies the coupon only to its shop and may drop that shop under the free threshold", () => {
    const t = computeTotals([line({ unitPrice: 5000 }), line({ shopId: "s2", productId: "p2", unitPrice: 6000 })], { option: "STANDARD", fees, coupon: coupon(), now });
    expect(t.shops[0]).toEqual({ shopId: "s1", subtotal: 5000, discount: 1000, deliveryFee: 150, total: 4150 });
    expect(t.shops[1]).toEqual({ shopId: "s2", subtotal: 6000, discount: 0, deliveryFee: 0, total: 6000 });
    expect(t.discount).toBe(1000);
  });
  it("reports coupon errors without applying a discount", () => {
    const t = computeTotals([line()], { option: "EXPRESS", fees, coupon: coupon({ usedCount: 100 }), now });
    expect(t.discount).toBe(0);
    expect(t.total).toBe(1300);
    expect(t.couponError).toMatch(/usage limit/);
  });
});
