import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

function accessEmails() {
  return new Set(
    (process.env.ACCESS_EMAIL ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminUser(user: { email?: string | null; emailVerified?: boolean } | null | undefined) {
  const email = user?.email?.trim().toLowerCase();
  if (!email) return false;
  return accessEmails().has(email) && user?.emailVerified === true;
}

export const requireAdmin = cache(async () => {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (!isAdminUser(session.user)) {
    redirect("/unauthorized");
  }

  return session.user;
});
