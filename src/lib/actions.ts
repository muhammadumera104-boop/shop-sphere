import { ZodError } from "zod";
import { AuthError } from "./permissions";

export type ActionState = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> } | null;

export class UserError extends Error {}

/** Convert thrown errors into a safe message for the UI. Unknown errors are logged, not leaked. */
export function actionError(e: unknown): ActionState {
  if (e instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of e.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
    return { ok: false, error: e.issues[0]?.message ?? "Invalid input.", fieldErrors };
  }
  if (e instanceof AuthError || e instanceof UserError) return { ok: false, error: e.message };
  // Next.js redirect()/notFound() must propagate
  if (e && typeof e === "object" && "digest" in e) throw e;
  console.error(e);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export function formObject(fd: FormData): Record<string, string> {
  const o: Record<string, string> = {};
  fd.forEach((v, k) => {
    if (typeof v === "string") o[k] = v;
  });
  return o;
}
