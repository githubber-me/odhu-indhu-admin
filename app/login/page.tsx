import { ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { GoogleSignIn } from "@/components/google-sign-in";
import { isAdminUser } from "@/lib/admin";
import { auth } from "@/lib/auth";

export const metadata = { title: "Sign in" };

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const { data: session } = await auth.getSession();
  if (isAdminUser(session?.user)) redirect("/dashboard");
  if (session?.user) redirect("/unauthorized");

  return (
    <main className="login-page">
      <section className="login-story">
        <BrandMark />
        <div className="story-copy">
          <span className="eyebrow light"><Sparkles size={14} /> Built for quiet oversight</span>
          <h1>Learning, at a glance.</h1>
          <p>
            A focused view of learners, study activity, generated topics, quizzes,
            and the weekly processing pipeline.
          </p>
        </div>
        <div className="story-card" aria-hidden="true">
          <div className="story-card-top">
            <span>Today&apos;s rhythm</span><span className="live-dot">Live</span>
          </div>
          <div className="rhythm-bars">
            {[32, 46, 38, 64, 78, 54, 86, 68, 92, 72, 58, 76].map((height, index) => (
              <i key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="story-card-foot">
            <strong>Progress has a pulse.</strong>
            <span>Keep an eye on what matters.</span>
          </div>
        </div>
        <p className="story-footer">Odhu Indhu · Private administration</p>
      </section>

      <section className="login-panel">
        <div className="login-box">
          <span className="secure-icon"><ShieldCheck size={22} /></span>
          <p className="eyebrow">Restricted access</p>
          <h2>Welcome back</h2>
          <p className="login-intro">
            Sign in with the authorised Google account to continue to your dashboard.
          </p>
          <GoogleSignIn />
          <p className="privacy-note">
            Access is protected by Google authentication and a server-side administrator allowlist.
          </p>
        </div>
      </section>
    </main>
  );
}
