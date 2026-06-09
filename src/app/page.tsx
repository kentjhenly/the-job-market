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
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Ticker tape */}
      <MatchTickerTape />

      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <span className="font-mono text-green text-sm tracking-widest">THE JOB MARKET</span>
        <div className="flex items-center gap-6">
          <Link
            href="/ticker"
            className="font-mono text-xs text-muted hover:text-green transition-colors tracking-widest"
          >
            LIVE FEED
          </Link>
          <Link
            href="/sign-in"
            className="font-mono text-xs text-muted hover:text-green transition-colors tracking-widest"
          >
            SIGN IN
          </Link>
          <Link
            href="/sign-up"
            className="font-mono text-xs bg-green text-bg px-4 py-2 hover:bg-green/90 transition-colors tracking-widest"
          >
            JOIN →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <p className="font-mono text-muted text-xs tracking-widest mb-4">
          SINGAPORE TECH · BETA
        </p>
        <h1 className="font-mono text-3xl md:text-5xl font-bold text-white leading-tight max-w-3xl">
          THE TRADING FLOOR
          <br />
          <span className="text-green">FOR HUMAN TALENT</span>
        </h1>
        <p className="font-mono text-muted text-sm max-w-xl mt-6 leading-relaxed">
          The best candidate rises to the top. The salary is grounded in data.
          <br />
          Every match has a price.
        </p>

        <div className="flex gap-4 mt-10">
          <Link
            href="/sign-up/candidate"
            className="font-mono text-sm bg-green text-bg px-8 py-4 hover:bg-green/90 transition-colors tracking-widest font-bold"
          >
            I AM A CANDIDATE
          </Link>
          <Link
            href="/sign-up/employer"
            className="font-mono text-sm border border-border text-white px-8 py-4 hover:border-green hover:text-green transition-colors tracking-widest"
          >
            I AM AN EMPLOYER
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mt-20 w-full max-w-3xl">
          {STATS.map((s) => (
            <div key={s.label} className="border border-border bg-surface p-4 text-left">
              <p className="font-mono text-xs text-muted tracking-widest">{s.label}</p>
              <p className="font-mono text-green text-sm font-bold mt-1">{s.value}</p>
              <p className="font-mono text-muted text-xs mt-1">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-8 w-full max-w-3xl">
          {FEATURES.map((f) => (
            <div key={f.title} className="border border-border bg-surface p-6 text-left">
              <h3 className="font-mono text-xs text-green tracking-widest mb-2">{f.title}</h3>
              <p className="font-mono text-muted text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border px-6 py-4 flex items-center justify-between">
        <span className="font-mono text-muted text-xs">
          © {new Date().getFullYear()} THE JOB MARKET
        </span>
        <span className="font-mono text-muted text-xs">
          SINGAPORE · TECH VERTICAL ONLY IN BETA
        </span>
      </footer>
    </div>
  );
}
