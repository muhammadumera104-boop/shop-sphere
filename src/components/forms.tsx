"use client";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/lib/actions";
import { buttonClass, cx, type ButtonVariant } from "./ui";

export type FormAction = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/**
 * Re-fetch the current page after a successful action so it shows fresh server data.
 * Actions don't call revalidatePath(): every page is dynamic, so this refresh is enough.
 */
export function useRefreshOnSuccess(state: ActionState) {
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);
}

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  className,
  pendingText,
  name,
  value,
  disabled,
  confirm,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
  pendingText?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending || disabled}
      aria-busy={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={buttonClass(variant, size, className)}
    >
      {pending && <span className="size-3.5 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
        {state.message}
      </p>
    );
  return null;
}

/** A form bound to a server action; shows the returned error / success message. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
  messageClassName,
  id,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  messageClassName?: string;
  id?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  useRefreshOnSuccess(state);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className} id={id}>
      {children}
      {state && (
        <div className={cx("mt-3", messageClassName)} aria-live="polite">
          <FormMessage state={state} />
        </div>
      )}
    </form>
  );
}

/** One-click action (e.g. "Accept order") with hidden fields and inline error. */
export function ActionButton({
  action,
  fields,
  children,
  variant = "primary",
  size = "sm",
  confirm,
  className,
}: {
  action: FormAction;
  fields: Record<string, string>;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  confirm?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  useRefreshOnSuccess(state);
  return (
    <form action={formAction} className={cx("inline-flex flex-col items-start gap-1", className)}>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton variant={variant} size={size} confirm={confirm}>
        {children}
      </SubmitButton>
      {state?.error && (
        <span role="alert" className="text-xs text-rose-700 max-w-56">
          {state.error}
        </span>
      )}
      {state?.message && (
        <span role="status" className="text-xs text-emerald-700 max-w-56">
          {state.message}
        </span>
      )}
    </form>
  );
}
