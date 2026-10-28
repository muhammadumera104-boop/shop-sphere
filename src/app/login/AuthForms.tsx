"use client";
import { useActionState, useState } from "react";
import { loginAction, registerAction } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/forms";
import { cx } from "@/components/ui";

export function AuthForms({ next, initialTab }: { next?: string; initialTab: "login" | "register" }) {
  const [tab, setTab] = useState(initialTab);
  const [show, setShow] = useState(false);
  const [loginState, login] = useActionState(loginAction, null);
  const [regState, register] = useActionState(registerAction, null);
  return (
    <div className="card w-full max-w-md p-6 sm:p-8">
      <div role="tablist" className="grid grid-cols-2 rounded-full bg-page p-1 mb-6">
        {(["login", "register"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cx("h-10 rounded-full text-sm font-medium", tab === t ? "bg-white shadow text-ink" : "text-muted")}
          >
            {t === "login" ? "Login" : "Register"}
          </button>
        ))}
      </div>

      {tab === "login" ? (
        <form action={login} className="space-y-4" aria-label="Login">
          <h2 className="text-xl font-bold">Welcome back</h2>
          <input type="hidden" name="next" value={next ?? ""} />
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input id="email" name="email" type="email" autoComplete="email" required className="input h-11" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required className="input h-11 pr-16" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-indigo-600" aria-label={show ? "Hide password" : "Show password"}>
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" name="remember" defaultChecked className="accent-indigo-600 size-4" /> Remember me
            </label>
            <span className="text-muted" title="Password reset needs an email provider, which is not configured.">
              Forgot password? <span className="text-xs">(email not configured)</span>
            </span>
          </div>
          <FormMessage state={loginState} />
          <SubmitButton size="lg" className="w-full" pendingText="Logging in…">
            Login
          </SubmitButton>
          <Divider />
          <button type="button" disabled className="w-full h-12 rounded-full border border-line bg-white text-sm font-medium text-muted cursor-not-allowed" title="Google sign-in is not configured">
            Continue with Google (not configured)
          </button>
          <p className="text-sm text-center text-muted">
            New here?{" "}
            <button type="button" className="text-indigo-600 font-medium" onClick={() => setTab("register")}>
              Create an account
            </button>
          </p>
        </form>
      ) : (
        <form action={register} className="space-y-4" aria-label="Register">
          <h2 className="text-xl font-bold">Create your account</h2>
          <input type="hidden" name="next" value={next ?? ""} />
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium">
              Full name
            </label>
            <input id="name" name="name" autoComplete="name" required minLength={2} className="input h-11" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="r-email" className="text-sm font-medium">
              Email
            </label>
            <input id="r-email" name="email" type="email" autoComplete="email" required className="input h-11" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="r-password" className="text-sm font-medium">
              Password
            </label>
            <input id="r-password" name="password" type={show ? "text" : "password"} autoComplete="new-password" required minLength={8} className="input h-11" />
            <p className="text-xs text-muted">At least 8 characters.</p>
          </div>
          <FormMessage state={regState} />
          <SubmitButton size="lg" className="w-full" pendingText="Creating account…">
            Create account
          </SubmitButton>
          <p className="text-sm text-center text-muted">
            Already have an account?{" "}
            <button type="button" className="text-indigo-600 font-medium" onClick={() => setTab("login")}>
              Login
            </button>
          </p>
        </form>
      )}
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted">
      <span className="h-px flex-1 bg-line" />
      or
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
