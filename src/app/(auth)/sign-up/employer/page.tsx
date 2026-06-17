"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth/auth-client";

export default function EmployerSignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
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
      name: form.companyName,
      // @ts-expect-error — Better Auth additionalFields
      role: "employer",
      display_name: form.companyName,
      callbackURL: "/employer/dashboard",
    });

    if (result.error) {
      setError(result.error.message ?? "Registration failed");
      setLoading(false);
      return;
    }

    router.push("/employer/dashboard");
    router.refresh();
  }

  return (
    <div className="panel p-8">
      <div className="mb-6">
        <Link href="/sign-up" className="link-up mono mb-1 inline-block" style={{ fontSize: 11 }}>
          ← BACK
        </Link>
        <h1 className="mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--up)", letterSpacing: "0.04em" }}>
          EMPLOYER REGISTRATION
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="kicker mb-1.5 block">FULL NAME</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
            className="field"
            placeholder="Jane Smith"
          />
        </div>

        <div>
          <label className="kicker mb-1.5 block">COMPANY NAME</label>
          <input
            type="text"
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            required
            className="field"
            placeholder="Acme Corp"
          />
        </div>

        {[
          { label: "WORK EMAIL", field: "email", type: "email", placeholder: "you@company.com" },
          { label: "PASSWORD", field: "password", type: "password", placeholder: "••••••••" },
          { label: "CONFIRM PASSWORD", field: "confirmPassword", type: "password", placeholder: "••••••••" },
        ].map(({ label, field, type, placeholder }) => (
          <div key={field}>
            <label className="kicker mb-1.5 block">{label}</label>
            <input
              type={type}
              value={form[field as keyof typeof form]}
              onChange={(e) => update(field, e.target.value)}
              required
              className="field"
              placeholder={placeholder}
            />
          </div>
        ))}

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
          {loading ? "REGISTERING..." : "CREATE EMPLOYER ACCOUNT"}
        </button>
      </form>

      <div className="hr my-6" />
      <p className="mono text-center" style={{ fontSize: 12, color: "var(--muted)" }}>
        ALREADY HAVE AN ACCOUNT?{" "}
        <Link href="/sign-in" className="link-up">
          SIGN IN
        </Link>
      </p>
    </div>
  );
}
