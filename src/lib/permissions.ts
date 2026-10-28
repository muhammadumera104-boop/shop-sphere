// Pure permission rules, shared by every server action / route. Unit tested in tests/unit/permissions.test.ts.
import type { Role } from "./constants";

export type Actor = {
  id: string;
  role: string;
  status?: string;
  shop?: { id: string; status: string } | null;
};

export class AuthError extends Error {
  constructor(
    message: string,
    public code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" = "FORBIDDEN",
  ) {
    super(message);
  }
}

export function hasRole(actor: Actor | null, roles: Role[]): boolean {
  return !!actor && actor.status !== "SUSPENDED" && roles.includes(actor.role as Role);
}

export function assertRole(actor: Actor | null, roles: Role[]): asserts actor is Actor {
  if (!actor) throw new AuthError("Please log in.", "UNAUTHENTICATED");
  if (!hasRole(actor, roles)) throw new AuthError("You do not have permission to do this.");
}

/** Seller Mode is open to buyer accounts that own a shop (any status, so pending shops can prepare). */
export function assertSeller(actor: Actor | null): asserts actor is Actor & { shop: { id: string; status: string } } {
  if (!actor) throw new AuthError("Please log in.", "UNAUTHENTICATED");
  if (actor.role !== "BUYER" || !actor.shop) throw new AuthError("Open a shop first to use Seller Mode.");
}

export function assertOwnsShop(actor: Actor | null, shopId: string) {
  assertSeller(actor);
  if (actor.shop.id !== shopId) throw new AuthError("This record belongs to another shop.", "NOT_FOUND");
}

export function canViewOrder(actor: Actor | null, order: { buyerId: string; shopId: string; deliveryPartnerId?: string | null }): boolean {
  if (!actor) return false;
  if (actor.role === "ADMIN") return true;
  if (order.buyerId === actor.id) return true;
  if (actor.shop && actor.shop.id === order.shopId) return true;
  if (actor.role === "DELIVERY" && order.deliveryPartnerId === actor.id) return true;
  return false;
}

export function isPubliclyVisible(p: { status: string; moderation: string; shop: { status: string } }): boolean {
  return p.status === "ACTIVE" && p.moderation === "OK" && p.shop.status === "APPROVED";
}
