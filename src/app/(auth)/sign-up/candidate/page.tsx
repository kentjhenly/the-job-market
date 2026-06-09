"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth/auth-client";

export default function CandidateSignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    const result = await signUp.email({
      email: form.email,
      password: form.password,
      name: form.name,
      // @ts-expect-error — Better Auth additionalFields
      role: "candidate",
      display_name: form.name,
    });

    if (result.error) {
      setError(result.error.message ?? "Registration failed");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="border border-border bg-surface p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/sign-up" className="text-muted hover:text-green font-mono text-xs">
            ← BACK
          </Link>
        </div>
        <h1 className="font-mono text-green text-lg tracking-wide">CANDIDATE REGISTRATION</h1>
        <p className="text-muted text-xs font-mono mt-1">
          YOUR SKILL SCORE IS YOUR PROFILE
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { label: "FULL NAME", field: "name", type: "text", placeholder: "Jane Smith" },
          { label: "EMAIL", field: "email", type: "email", placeholder: "you@example.com" },
          { label: "PASSWORD", field: "password", type: "password", placeholder: "••••••••" },
          {
            label: "CONFIRM PASSWORD",
            field: "confirmPassword",
            type: "password",
            placeholder: "••••••••",
          },
        ].map(({ label, field, type, placeholder }) => (
          <div key={field}>
            <label className="block text-muted text-xs font-mono mb-1 tracking-widest">
              {label}
            </label>
            <input
              type={type}
              value={form[field as keyof typeof form]}
              onChange={(e) => update(field, e.target.value)}
              required
              className="w-full bg-bg border border-border text-white font-mono text-sm px-3 py-2 focus:outline-none focus:border-green transition-colors"
              placeholder={placeholder}
            />
          </div>
        ))}

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
          {loading ? "REGISTERING..." : "CREATE CANDIDATE ACCOUNT"}
        </button>
      </form>
    </div>
  );
}
