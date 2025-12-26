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

export async function signupAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "MEMBER");
  const role = roleRaw === "ORGANIZER" ? "ORGANIZER" : "MEMBER";

  if (!email) return { error: "Email is required." };
  if (!isValidEmail(email)) return { error: "Please enter a valid email." };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters." };
  if (password !== password2) return { error: "Passwords do not match." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with this email already exists." };

  // We compute these so redirect happens OUTSIDE try/catch
  let sent = false;

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

    // Email sending is allowed to fail; we still proceed
    try {
      const result = await sendVerificationEmail({ to: email, token });
      sent = !!result?.sent;
    } catch (mailErr) {
      console.error("[signupAction] email send failed:", mailErr);
      sent = false;
    }
  } catch (err) {
    console.error("[signupAction] failed:", err);

    const msg =
      process.env.NODE_ENV === "development" && err instanceof Error
        ? err.message
        : "Signup failed. Please try again.";

    return { error: msg };
  }

  // ✅ redirect must not be inside try/catch (prevents NEXT_REDIRECT being treated as an error)
  redirect(`/check-email?email=${encodeURIComponent(email)}&sent=${sent ? "1" : "0"}`);
}
