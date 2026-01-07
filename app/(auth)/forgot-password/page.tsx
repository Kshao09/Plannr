import ForgotPasswordForm from "./ForgotPasswordForm";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-semibold text-zinc-900">Forgot password</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Enter your email and we’ll send a reset link.
        </p>
        <div className="mt-6">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
