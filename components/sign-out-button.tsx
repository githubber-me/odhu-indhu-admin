"use client";

import { useState } from "react";
import { createAuthClient } from "@neondatabase/auth/next";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

const authClient = createAuthClient();

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button className={compact ? "icon-button" : "sign-out-button"} onClick={signOut} disabled={pending}>
      <LogOut size={17} />
      {!compact && <span>{pending ? "Signing out…" : "Sign out"}</span>}
    </button>
  );
}
