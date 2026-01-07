import Link from "next/link";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-semibold text-zinc-900">Sign up</h1>

        <SignupForm />

        <p className="mt-4 text-sm text-zinc-600">
          Already have an account?{" "}
          <Link className="font-semibold text-zinc-900 hover:underline" href="/login">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
