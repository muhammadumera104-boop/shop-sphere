import { describe, expect, it } from "vitest";
import { assertOwnsShop, assertRole, assertSeller, AuthError, canViewOrder, hasRole, isPubliclyVisible } from "@/lib/permissions";
import { canTransition } from "@/lib/constants";
import { partyBalance, statement, toCsv } from "@/lib/services/khata";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";
import { sniffImageType } from "@/lib/uploads";
import { actorKinds } from "@/lib/services/orders";

const buyer = { id: "u1", role: "BUYER", shop: null };
const seller = { id: "u2", role: "BUYER", shop: { id: "s1", status: "APPROVED" } };
const admin = { id: "u3", role: "ADMIN", shop: null };
const rider = { id: "u4", role: "DELIVERY", shop: null };

describe("role checks", () => {
  it("allows only the listed roles", () => {
    expect(hasRole(admin, ["ADMIN"])).toBe(true);
    expect(hasRole(buyer, ["ADMIN"])).toBe(false);
    expect(hasRole(null, ["BUYER"])).toBe(false);
    expect(hasRole({ ...admin, status: "SUSPENDED" }, ["ADMIN"])).toBe(false);
    expect(() => assertRole(buyer, ["ADMIN"])).toThrow(AuthError);
    expect(() => assertRole(null, ["ADMIN"])).toThrow(/log in/i);
  });
  it("Seller Mode needs a buyer account that owns a shop", () => {
    expect(() => assertSeller(buyer)).toThrow(/open a shop/i);
    expect(() => assertSeller(admin)).toThrow();
    expect(() => assertSeller(seller)).not.toThrow();
    expect(() => assertOwnsShop(seller, "s1")).not.toThrow();
    expect(() => assertOwnsShop(seller, "s2")).toThrow(/another shop/);
  });
  it("order visibility: buyer, owning seller, assigned rider, admin only", () => {
    const order = { buyerId: "u1", shopId: "s1", deliveryPartnerId: "u4" };
    expect(canViewOrder(buyer, order)).toBe(true);
    expect(canViewOrder(seller, order)).toBe(true);
    expect(canViewOrder(rider, order)).toBe(true);
    expect(canViewOrder(admin, order)).toBe(true);
    expect(canViewOrder({ id: "x", role: "BUYER", shop: { id: "s9", status: "APPROVED" } }, order)).toBe(false);
    expect(canViewOrder({ id: "u5", role: "DELIVERY" }, order)).toBe(false);
  });
  it("order status transitions depend on who acts", () => {
    expect(canTransition("PENDING", "CONFIRMED", "SELLER")).toBe(true);
    expect(canTransition("PENDING", "CONFIRMED", "BUYER")).toBe(false);
    expect(canTransition("PENDING", "CANCELLED", "BUYER")).toBe(true);
    expect(canTransition("PACKED", "CANCELLED", "BUYER")).toBe(false);
    expect(canTransition("SHIPPED", "DELIVERED", "SELLER")).toBe(false);
    expect(canTransition("SHIPPED", "DELIVERED", "DELIVERY")).toBe(true);
    expect(canTransition("DELIVERED", "PENDING", "ADMIN")).toBe(false);
  });
  it("actorKinds identifies each party's role on an order", () => {
    const order = { buyerId: "u1", shopId: "s1", shipment: { deliveryPartnerId: "u4" } };
    expect(actorKinds(buyer, order)).toEqual(["BUYER"]);
    expect(actorKinds(seller, order)).toEqual(["SELLER"]);
    expect(actorKinds(rider, order)).toEqual(["DELIVERY"]);
    expect(actorKinds({ id: "u9", role: "DELIVERY" }, order)).toEqual([]);
  });
  it("only approved shops' active, unmoderated products are public", () => {
    expect(isPubliclyVisible({ status: "ACTIVE", moderation: "OK", shop: { status: "APPROVED" } })).toBe(true);
    expect(isPubliclyVisible({ status: "ACTIVE", moderation: "OK", shop: { status: "PENDING" } })).toBe(false);
    expect(isPubliclyVisible({ status: "DRAFT", moderation: "OK", shop: { status: "APPROVED" } })).toBe(false);
    expect(isPubliclyVisible({ status: "ACTIVE", moderation: "REMOVED", shop: { status: "APPROVED" } })).toBe(false);
  });
});

describe("Khata balances", () => {
  const d = (s: string) => new Date(`2026-10-${s}T12:00:00Z`);
  const entries = [
    { type: "CREDIT", amount: 2500, date: d("12") },
    { type: "PAYMENT", amount: 1000, date: d("15") },
    { type: "CREDIT", amount: 2700, date: d("20") },
    { type: "CREDIT", amount: 9999, date: d("21"), deletedAt: d("22") },
  ];
  it("balance = credit given - payments received, ignoring deleted entries", () => {
    expect(partyBalance(entries)).toBe(4200);
    expect(partyBalance([])).toBe(0);
    expect(partyBalance([{ type: "PAYMENT", amount: 500, date: d("01") }])).toBe(-500);
  });
  it("statement has a running balance in date order", () => {
    const shuffled = [entries[2], entries[0], entries[3], entries[1]];
    expect(statement(shuffled).map((e) => e.running)).toEqual([2500, 1500, 4200]);
  });
  it("CSV export escapes quotes and neutralises formulas", () => {
    expect(toCsv([["a,b", 'say "hi"', "=SUM(A1)", 5]])).toBe(`"a,b","say ""hi""",'=SUM(A1),5`);
  });
});

describe("rate limiting", () => {
  it("blocks after the limit within the window and resets after", () => {
    resetRateLimits();
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 1000, 0).ok).toBe(true);
    expect(rateLimit("k", 3, 1000, 10).ok).toBe(false);
    expect(rateLimit("k", 3, 1000, 1001).ok).toBe(true);
  });
});

describe("upload sniffing", () => {
  it("recognises real image headers and rejects others", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe("image/png");
    expect(sniffImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
});
