// app/(auth)/signup/actions.ts
"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/mailer";

type FormState = { error?: string | null };

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function signupAction(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "MEMBER");
  const role = roleRaw === "ORGANIZER" ? "ORGANIZER" : "MEMBER";

  if (!email) return { error: "Email is required." };
  if (!isValidEmail(email)) return { error: "Please enter a valid email." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== password2) return { error: "Passwords do not match." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with this email already exists." };

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        hashedPassword,
        role: role as any,
        emailVerified: null,
      },
      select: { id: true },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await prisma.emailVerificationToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const result = await sendVerificationEmail({ to: email, token });

    // ✅ even if not sent, still move user forward
    redirect(
      `/check-email?email=${encodeURIComponent(email)}&sent=${result.sent ? "1" : "0"}`
    );
  } catch (err) {
    console.error("[signupAction] failed:", err);

    // ✅ show real message in dev so you can fix quickly
    const msg =
      process.env.NODE_ENV === "development" && err instanceof Error
        ? err.message
        : "Signup failed. Please try again.";

    return { error: msg };
  }
}
