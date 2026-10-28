// Next.js-aware auth helpers: read the session cookie and enforce roles on the server.
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionRecord, deleteSessionRecord, userFromToken } from "./session";
import { assertRole, assertSeller, AuthError } from "./permissions";
import type { Role } from "./constants";

export const COOKIE = process.env.SESSION_COOKIE_NAME || "ss_session";

export const getCurrentUser = cache(async () => {
  const store = await cookies();
  return userFromToken(store.get(COOKIE)?.value);
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function startSession(userId: string) {
  const { token, expiresAt } = await createSessionRecord(userId);
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await deleteSessionRecord(token);
  store.delete(COOKIE);
}

/** For server actions: throws AuthError (converted to a message by `actionError`). */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Please log in.", "UNAUTHENTICATED");
  return user;
}

export async function requireRole(roles: Role[]) {
  const user = await getCurrentUser();
  assertRole(user, roles);
  return user as CurrentUser;
}

export async function requireSeller() {
  const user = await getCurrentUser();
  assertSeller(user);
  return user as CurrentUser & { shop: NonNullable<CurrentUser["shop"]> };
}

/** For pages: redirect instead of throwing. */
export async function pageUser(next: string, roles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (roles && !roles.includes(user.role as Role)) redirect("/forbidden");
  return user;
}

export async function pageSeller(next: string) {
  const user = await pageUser(next, ["BUYER"]);
  if (!user.shop) redirect("/open-shop");
  return user as CurrentUser & { shop: NonNullable<CurrentUser["shop"]> };
}

export async function requestMeta() {
  const h = await headers();
  return {
    ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local",
    userAgent: (h.get("user-agent") ?? "").slice(0, 200),
  };
}
