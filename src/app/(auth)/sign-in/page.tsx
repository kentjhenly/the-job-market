"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn.email({ email, password });

    if (result.error) {
      setError(result.error.message ?? "Sign in failed");
      setLoading(false);
      return;
    }

    router.push("/candidate/dashboard");
    router.refresh();
  }

  return (
    <div className="panel p-8">
      <div className="mb-6">
        <h1 className="mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--up)", letterSpacing: "0.04em" }}>
          ACCESS TERMINAL
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="kicker mb-1.5 block">EMAIL</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="field"
          />
        </div>

        <div>
          <label className="kicker mb-1.5 block">PASSWORD</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="field"
          />
        </div>

        {error && (
          <div
            className="rounded px-3 py-2"
            style={{ border: "1px solid color-mix(in oklch, var(--down) 40%, transparent)", background: "var(--down-dim)" }}
          >
            <p className="mono" style={{ fontSize: 12, color: "var(--down)" }}>
              {error}
            </p>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
          {loading ? "AUTHENTICATING..." : "SIGN IN"}
        </button>
      </form>

      <div className="hr my-6" />
      <p className="mono text-center" style={{ fontSize: 12, color: "var(--muted)" }}>
        NEW TO THE MARKET?{" "}
        <Link href="/sign-up" className="link-up">
          SIGN UP
        </Link>
      </p>
    </div>
  );
}
