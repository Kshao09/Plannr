// app/(auth)/signup/page.tsx
import Link from "next/link";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-2xl font-semibold text-white">Sign up</h1>

        <SignupForm />

        <p className="mt-4 text-sm text-zinc-400">
          Already have an account?{" "}
          <Link className="text-zinc-200 hover:underline" href="/login">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
