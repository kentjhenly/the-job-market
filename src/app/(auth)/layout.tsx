import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-start justify-center px-4 py-16" style={{ background: "var(--bg-deep)" }}>
      <div className="w-full max-w-lg">
        <div className="mb-10 text-center">
          <Link
            href="/"
            className="mono"
            style={{ color: "var(--gold)", fontSize: 22, letterSpacing: "0.16em", fontWeight: 700 }}
          >
            ◧ THE JOB MARKET
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
