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

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="border border-border bg-surface p-8">
      <div className="mb-6">
        <h1 className="font-mono text-green text-lg tracking-wide">ACCESS TERMINAL</h1>
        <p className="text-muted text-xs font-mono mt-1">AUTHENTICATE TO CONTINUE</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-muted text-xs font-mono mb-1 tracking-widest">
            EMAIL
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-bg border border-border text-white font-mono text-sm px-3 py-2 focus:outline-none focus:border-green transition-colors"
            placeholder="you@company.com"
          />
        </div>

        <div>
          <label className="block text-muted text-xs font-mono mb-1 tracking-widest">
            PASSWORD
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-bg border border-border text-white font-mono text-sm px-3 py-2 focus:outline-none focus:border-green transition-colors"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="border border-danger/30 bg-danger/10 px-3 py-2">
            <p className="text-danger text-xs font-mono">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green text-bg font-mono text-sm font-bold py-3 tracking-widest hover:bg-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "AUTHENTICATING..." : "SIGN IN"}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-border text-center">
        <p className="text-muted text-xs font-mono">
          NEW TO THE MARKET?{" "}
          <Link href="/sign-up" className="text-green hover:underline">
            REGISTER
          </Link>
        </p>
      </div>
    </div>
  );
}
