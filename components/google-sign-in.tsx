"use client";

import { useState } from "react";
import { createAuthClient } from "@neondatabase/auth/next";
import { ArrowRight, LoaderCircle } from "lucide-react";

const authClient = createAuthClient();

export function GoogleSignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignIn() {
    setLoading(true);
    setError("");

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
        errorCallbackURL: "/login?error=oauth",
      });

      if (result.error) {
        setError(result.error.message ?? "Google sign-in could not be started.");
        setLoading(false);
      }
    } catch {
      setError("Google sign-in could not be started. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="login-action">
      <button className="google-button" onClick={handleSignIn} disabled={loading}>
        <span className="google-g" aria-hidden="true">G</span>
        <span>{loading ? "Opening Google…" : "Continue with Google"}</span>
        {loading ? (
          <LoaderCircle className="spin" size={18} />
        ) : (
          <ArrowRight size={18} />
        )}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
