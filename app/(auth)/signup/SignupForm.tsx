// app/(auth)/signup/SignupForm.tsx
"use client";

import { useEffect, useRef, useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signupAction } from "./actions";

type FormState = { error?: string | null };

const initialState: FormState = { error: null };

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="w-full rounded-xl bg-white px-4 py-3 font-medium text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Creating account..." : "Create account"}
    </button>
  );
}

export default function SignupForm() {
  // ✅ React 19 / Next newer versions: useActionState (not useFormState)
  const [state, formAction] = useActionState(signupAction, initialState);

  const formRef = useRef<HTMLFormElement>(null);

  const [clientError, setClientError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (state?.error) setDismissed(false);
  }, [state?.error]);

  const shownError = !dismissed ? (clientError ?? state?.error ?? null) : null;

  function clearErrorsOnInput() {
    setClientError(null);
    setDismissed(true);
  }

  function validateClient(fd: FormData): string | null {
    const email = String(fd.get("email") ?? "").toLowerCase().trim();
    const password = String(fd.get("password") ?? "");
    const password2 = String(fd.get("password2") ?? "");

    if (!email) return "Email is required.";
    if (!isValidEmail(email)) return "Please enter a valid email.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== password2) return "Passwords do not match.";
    return null;
  }

  return (
    <>
      {shownError ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {shownError}
        </div>
      ) : null}

      <form
        ref={formRef}
        className="mt-6 space-y-4"
        action={formAction}
        onChange={clearErrorsOnInput}
        onSubmit={(e) => {
          const fd = new FormData(formRef.current!);
          const err = validateClient(fd);
          if (err) {
            e.preventDefault();
            setClientError(err);
            setDismissed(false);
          }
        }}
      >
        <input
          name="name"
          placeholder="Name (optional)"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
        />

        <input
          name="email"
          type="email"
          placeholder="Email"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
          required
        />

        <input
          name="password"
          type="password"
          placeholder="Password (min 8 chars)"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
          required
        />

        <input
          name="password2"
          type="password"
          placeholder="Retype password"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
          required
        />

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-sm font-medium text-zinc-200">Account type</p>
          <div className="mt-2 flex gap-4 text-sm text-zinc-200">
            <label className="flex items-center gap-2">
              <input type="radio" name="role" value="MEMBER" defaultChecked />
              Member
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="role" value="ORGANIZER" />
              Organizer
            </label>
          </div>
        </div>

        <SubmitButton />
      </form>
    </>
  );
}
