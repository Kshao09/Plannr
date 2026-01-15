import Link from "next/link";
import SignupForm from "./SignupForm";
import { signIn } from "@/auth";

function GoogleIcon() {
  return (
    <svg
      viewBox="0 0 256 262"
      className="h-5 w-5"
      aria-hidden="true"
      focusable="false"
    >
      {/* Blue */}
      <path
        fill="#4285F4"
        d="M255.88 133.45c0-10.73-.87-18.57-2.75-26.69H130.55v48.45h71.95c-1.45 12.04-9.28 30.17-26.69 42.36l-.24 1.62 38.76 30.02 2.69.27c24.66-22.77 38.86-56.28 38.86-96.03"
      />
      {/* Green */}
      <path
        fill="#34A853"
        d="M130.55 261.1c35.25 0 64.84-11.6 86.45-31.62l-41.2-31.92c-11.02 7.7-25.82 13.07-45.25 13.07-34.53 0-63.74-22.77-74.27-54.25l-1.53.13-40.3 31.18-.53 1.47c21.47 42.76 65.44 71.86 116.1 71.86"
      />
      {/* Yellow */}
      <path
        fill="#FBBC05"
        d="M56.28 156.37c-2.75-8.12-4.35-16.81-4.35-25.82s1.6-17.7 4.2-25.82l-.07-1.73L15.26 71.2l-1.34.64C5.08 89.64 0 109.52 0 130.55s5.08 40.9 13.92 58.7l42.36-32.88"
      />
      {/* Red */}
      <path
        fill="#EA4335"
        d="M130.55 50.48c24.5 0 41.05 10.58 50.48 19.43l36.84-35.98C195.24 12.91 165.8 0 130.55 0 79.9 0 35.93 29.1 14.92 71.84l41.13 31.92c10.69-31.48 39.9-53.28 74.5-53.28"
      />
    </svg>
  );
}

export default function SignupPage() {
  const card =
    "rounded-3xl border border-zinc-200 bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]";
  const googleBtn =
    "w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-medium text-zinc-900 transition hover:bg-zinc-50 focus:outline-none focus:ring-4 focus:ring-zinc-200 flex items-center justify-center gap-3";
  const pill =
    "rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700";

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className={card}>
        <h1 className="text-2xl font-semibold text-zinc-900">Sign up</h1>

        {/* Google Signup - choose role */}
        <div className="mt-6 space-y-3">
          <form
            action={async () => {
              "use server";
              await signIn("google", {
                redirectTo: `/auth/role?role=MEMBER&next=${encodeURIComponent("/app/dashboard")}`,
              });
            }}
          >
            <button type="submit" className={googleBtn}>
              <GoogleIcon />
              Continue with Google <span className={pill}>Member</span>
            </button>
          </form>

          <form
            action={async () => {
              "use server";
              await signIn("google", {
                redirectTo: `/auth/role?role=ORGANIZER&next=${encodeURIComponent("/app/dashboard")}`,
              });
            }}
          >
            <button type="submit" className={googleBtn}>
              <GoogleIcon />
              Continue with Google <span className={pill}>Organizer</span>
            </button>
          </form>
        </div>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px w-full bg-zinc-200" />
          <div className="text-xs text-zinc-500">or</div>
          <div className="h-px w-full bg-zinc-200" />
        </div>

        {/* Credentials Signup */}
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
