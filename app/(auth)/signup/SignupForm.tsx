"use client";

import { useEffect, useRef, useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signupAction } from "./actions";

type FormState = { error?: string | null };
const initialState: FormState = { error: null };

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const input =
  "w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="w-full rounded-2xl bg-zinc-900 px-4 py-3 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-zinc-300"
    >
      {pending ? "Creating account..." : "Create account"}
    </button>
  );
}

export default function SignupForm() {
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
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
        <input name="name" placeholder="Name (optional)" className={input} />

        <input name="email" type="email" placeholder="Email" className={input} required />

        <input
          name="password"
          type="password"
          placeholder="Password (min 8 chars)"
          className={input}
          required
        />

        <input
          name="password2"
          type="password"
          placeholder="Retype password"
          className={input}
          required
        />

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm font-medium text-zinc-900">Account type</p>
          <div className="mt-2 flex gap-6 text-sm text-zinc-700">
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
