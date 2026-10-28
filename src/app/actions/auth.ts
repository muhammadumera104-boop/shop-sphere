"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { endSession, requestMeta, startSession } from "@/lib/auth";
import { actionError, formObject, type ActionState, UserError } from "@/lib/actions";
import { clearRateLimit, rateLimit } from "@/lib/rate-limit";
import { hashPassword, verifyPassword } from "@/lib/session";
import { loginSchema, registerSchema } from "@/lib/validation";

/** Only allow same-site relative redirects. */
function safeNext(next: string | undefined, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}

function homeFor(role: string) {
  return role === "ADMIN" ? "/admin" : role === "DELIVERY" ? "/delivery" : "/";
}

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let target = "/";
  try {
    const input = loginSchema.parse(formObject(fd));
    const { ip } = await requestMeta();
    // 5 attempts per 10 minutes per IP + email; a successful login clears the counter.
    const key = `login:${ip}:${input.email}`;
    const rl = rateLimit(key, 5, 10 * 60_000);
    if (!rl.ok) throw new UserError(`Too many login attempts. Try again in ${Math.ceil(rl.retryAfterMs / 60000)} minutes.`);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    // Same message for unknown email and wrong password.
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) throw new UserError("Email or password is incorrect.");
    if (user.status !== "ACTIVE") throw new UserError("This account is suspended. Contact support.");
    clearRateLimit(key);
    await startSession(user.id);
    target = safeNext(input.next, homeFor(user.role));
  } catch (e) {
    return actionError(e);
  }
  redirect(target);
}

export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let target = "/";
  try {
    const input = registerSchema.parse(formObject(fd));
    const { ip } = await requestMeta();
    const rl = rateLimit(`register:${ip}`, 5, 60 * 60_000);
    if (!rl.ok) throw new UserError("Too many accounts created from this network. Try again later.");
    const exists = await prisma.user.findUnique({ where: { email: input.email } });
    if (exists) throw new UserError("An account with this email already exists. Log in instead.");
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        notifications: { create: { kind: "ACCOUNT", title: "Welcome to ShopSphere", body: "Add an address to check out faster.", link: "/account/addresses" } },
      },
    });
    await startSession(user.id);
    target = safeNext(String(fd.get("next") ?? ""), "/");
  } catch (e) {
    return actionError(e);
  }
  redirect(target);
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}
