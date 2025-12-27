"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/mailer";

export async function resendVerificationAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();

  if (!email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true },
  });

  if (!user) {
    redirect(`/check-email?email=${encodeURIComponent(email)}&sent=0&resent=1&err=EmailNotFound`);
  }

  // Already verified -> just go login
  if (user.emailVerified) {
    redirect(`/login?verified=1`);
  }

  // Optional: clear previous tokens so only latest works
  await prisma.emailVerificationToken.deleteMany({
    where: { userId: user.id },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

  await prisma.emailVerificationToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  const result = await sendVerificationEmail({ to: email, token });

  redirect(
    `/check-email?email=${encodeURIComponent(email)}&sent=${result.sent ? "1" : "0"}&resent=1`
  );
}
