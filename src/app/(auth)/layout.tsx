import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ background: "var(--bg-deep)" }}>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="mono"
            style={{ color: "var(--up)", fontSize: 13, letterSpacing: "0.16em", fontWeight: 700 }}
          >
            ◧ THE JOB MARKET
          </Link>
          <p className="kicker mt-2">THE TRADING FLOOR FOR HUMAN TALENT</p>
        </div>
        {children}
      </div>
    </div>
  );
}
