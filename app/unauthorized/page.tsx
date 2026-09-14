import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata = { title: "Access denied" };

export default function UnauthorizedPage() {
  return (
    <main className="centered-page">
      <BrandMark />
      <section className="message-card">
        <span className="message-icon"><LockKeyhole size={24} /></span>
        <p className="eyebrow">Private workspace</p>
        <h1>This account is not authorised.</h1>
        <p>
          The Odhu Indhu admin console is limited to its designated administrator.
          Sign out and continue with the approved Google account.
        </p>
        <div className="message-actions">
          <SignOutButton />
          <Link className="text-link" href="/login">Back to sign in</Link>
        </div>
      </section>
    </main>
  );
}
