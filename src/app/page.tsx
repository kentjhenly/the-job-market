import Link from "next/link";
import { MatchTickerTape } from "@/components/terminal/MatchTickerTape";

const STATS = [
  { label: "RANKING SIGNAL", value: "SKILL SCORE", desc: "Not your CV" },
  { label: "SALARY MODEL", value: "REGRESSION", desc: "Market-anchored" },
  { label: "MATCH COST", value: "ZERO UPFRONT", desc: "Pay on match" },
  { label: "BIAS REDUCTION", value: "ALGORITHMIC", desc: "Score, not background" },
];

const FEATURES = [
  {
    title: "RANKED BY SKILL",
    desc: "Complete challenges. Get ranked by demonstrated ability. No CV. No guesswork.",
  },
  {
    title: "MARKET SALARY ENGINE",
    desc: "A live regression model gives both parties a neutral, data-backed salary anchor.",
  },
  {
    title: "EMPLOYERS COME TO YOU",
    desc: "Employers browse a ranked feed and pay to pitch. You decide who gets your attention.",
  },
  {
    title: "ANTI-GHOSTING BY DESIGN",
    desc: "Ghosting degrades employer reputation and cuts their access to top candidates.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--bg)" }}>
      <MatchTickerTape />

      <nav className="flex items-center justify-between border-b border-border px-6 py-4">
        <span className="mono" style={{ color: "var(--up)", fontSize: 13, letterSpacing: "0.16em", fontWeight: 700 }}>
          ◧ THE JOB MARKET
        </span>
        <div className="flex items-center gap-6">
          <Link href="/ticker" className="kicker transition-colors hover:text-text-2">
            LIVE FEED
          </Link>
          <Link href="/sign-in" className="kicker transition-colors hover:text-text-2">
            SIGN IN
          </Link>
          <Link href="/sign-up" className="btn btn-primary btn-sm">
            JOIN →
          </Link>
        </div>
      </nav>

      <main className="grid-tex flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <p className="kicker mb-4">SINGAPORE TECH · BETA</p>
        <h1
          className="mono max-w-3xl text-3xl font-bold md:text-5xl"
          style={{ color: "var(--text)", lineHeight: 1.15 }}
        >
          THE TRADING FLOOR
          <br />
          <span style={{ color: "var(--up)" }}>FOR HUMAN TALENT</span>
        </h1>
        <p className="mono mt-6 max-w-xl" style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>
          The best candidate rises to the top. The salary is grounded in data.
          <br />
          Every match has a price.
        </p>

        <div className="mt-10 flex gap-4">
          <Link href="/sign-up/candidate" className="btn btn-primary btn-lg">
            I AM A CANDIDATE
          </Link>
          <Link href="/sign-up/employer" className="btn btn-ghost btn-lg">
            I AM AN EMPLOYER
          </Link>
        </div>

        <div className="view-enter mt-20 grid w-full max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="panel p-4 text-left">
              <p className="kicker">{s.label}</p>
              <p className="mono mt-1" style={{ fontSize: 13, fontWeight: 700, color: "var(--up)" }}>
                {s.value}
              </p>
              <p className="mono mt-1" style={{ fontSize: 11, color: "var(--muted)" }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="view-enter mt-8 grid w-full max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="panel p-6 text-left">
              <h3 className="kicker mb-2" style={{ color: "var(--up)" }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="flex items-center justify-between border-t border-border px-6 py-4">
        <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
          © {new Date().getFullYear()} THE JOB MARKET
        </span>
        <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
          SINGAPORE · TECH VERTICAL ONLY IN BETA
        </span>
      </footer>
    </div>
  );
}
