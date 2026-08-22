"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const identifier = String(formData.get("identifier") || "").trim();
  const password = String(formData.get("password") || "");

  if (!identifier || !password) {
    return { error: "Enter your email or employee ID and password." };
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier.toLowerCase() },
        { employeeId: identifier.toUpperCase() },
      ],
    },
  });

  if (!user) {
    return { error: "No account found for those credentials." };
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return { error: "Incorrect password." };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function signOutAction() {
  await destroySession();
  redirect("/login");
}
