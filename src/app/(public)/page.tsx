import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { formatSalary } from "@/lib/utils/formatters";
import { MarketSnapshotPanel } from "@/components/terminal/MarketSnapshotPanel";
import { getMarketSnapshot } from "@/lib/market/snapshot";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const BOARD = [
  { label: "RANKING SIGNAL", value: "SKILL SCORE", desc: "NOT YOUR CV" },
  { label: "SALARY MODEL", value: "REGRESSION", desc: "MARKET-ANCHORED" },
  { label: "PRICING", value: "FREE TRIAL", desc: "3 FREE, THEN CREDITS" },
  { label: "BIAS REDUCTION", value: "ALGORITHMIC", desc: "SCORE, NOT BACKGROUND" },
];

const FEATURES = [
  {
    title: "RANKED BY SKILL",
    desc: "Build a portfolio of real work. Get ranked by demonstrated ability — no CV, no guesswork.",
  },
  {
    title: "MARKET SALARY ENGINE",
    desc: "A live regression model gives both parties a neutral, data-backed salary anchor.",
  },
  {
    title: "NO BLACK BOX",
    desc: "Your composite score and salary estimate are weighted, documented formulas — not a hidden model. The dashboard breaks every factor down against your peers and tells you what to improve next.",
  },
  {
    title: "PITCHES ARE FREE",
    desc: "Employers browse a ranked feed and pitch for free. Posting roles and accepting pitches use credits — your first 3 of each are on us.",
  },
  {
    title: "ANTI-GHOSTING BY DESIGN",
    desc: "Silence has a cost on both sides — unanswered pitches, chats, and offers dock reputation and limit future access.",
  },
];

export default async function LandingPage() {
  const supabasePublic = await getSupabaseServerClient();

  const [{ data: tickerEvents }, snapshot, session] = await Promise.all([
    supabasePublic
      .from("match_ticker_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
    getMarketSnapshot(),
    getServerSession(),
  ]);

  // BUY LABOR -> employer sign-up, SELL LABOR -> candidate sign-up. If the
  // signed-in user's role matches the button's own side, "/sign-in" just
  // logs them into their existing dashboard (proxy redirects authenticated
  // users away from /sign-in). Otherwise the button goes to the opposite
  // sign-up form, which stays reachable while logged in.
  const role = (session?.user as { role?: string } | undefined)?.role;
  const buyHref = role === "employer" ? "/sign-in" : "/sign-up/employer";
  const sellHref = role === "candidate" ? "/sign-in" : "/sign-up/candidate";

  return (
    <>
      <main className="scroll-main view-enter mx-auto w-full max-w-[1040px] px-6 py-8">
        {/* asymmetric hero: headline left, live market snapshot right */}
        <section className="relative py-8 md:py-12">
          <div className="grid-tex" style={{ position: "absolute", inset: "-30px -60px 0", zIndex: 0 }} />
          <div className="relative z-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,1fr)]">
            <div>
              <span className="t-reveal inline-flex items-center gap-2.5">
                <span
                  className="mono"
                  style={{
                    color: "var(--gold)",
                    fontSize: 11,
                    letterSpacing: "0.2em",
                    border: "1px solid color-mix(in oklch, var(--gold) 40%, transparent)",
                    background: "var(--gold-dim)",
                    padding: "4px 10px",
                    borderRadius: 3,
                  }}
                >
                  HKEX:TALENT
                </span>
                <span className="kicker">HONG KONG TECH · BETA</span>
              </span>
              <h1
                className="t-reveal"
                style={{
                  fontSize: "clamp(34px, 4.8vw, 56px)",
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.05,
                  margin: "20px 0 0",
                  color: "var(--text)",
                }}
              >
                Rational people
                <br />
                <span style={{ color: "var(--up)" }}>think at the margin.</span>
              </h1>
              <p
                className="t-reveal mono"
                style={{ color: "var(--muted)", fontSize: 13, maxWidth: 440, margin: "20px 0 0", lineHeight: 1.75 }}
              >
                The third principle of economics; manifest.
              </p>
              <div className="t-reveal mt-7 flex flex-wrap gap-3">
                <Link href={buyHref} className="btn btn-primary btn-lg">
                  BUY LABOR
                </Link>
                <Link href={sellHref} className="btn btn-danger-solid btn-lg">
                  SELL LABOR
                </Link>
              </div>
              <p className="t-reveal mono" style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 22, letterSpacing: "0.08em" }}>
                3 FREE POSTINGS & ACCEPTS · 72H RESPONSE WINDOW · REPUTATION-ENFORCED
              </p>
            </div>

            <MarketSnapshotPanel initial={snapshot} />
          </div>
        </section>

        {/* exchange board strip */}
        <ScrollReveal className="mb-3.5">
          <section className="board-strip">
            {BOARD.map((s) => (
              <div key={s.label} className="board-cell">
                <p className="kicker" style={{ margin: 0 }}>
                  {s.label}
                </p>
                <p className="mono" style={{ color: "var(--up)", fontSize: 15, fontWeight: 700, margin: "7px 0 0" }}>
                  {s.value}
                </p>
                <p className="mono" style={{ color: "var(--dim)", fontSize: 10, letterSpacing: "0.08em", margin: "5px 0 0" }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </section>
        </ScrollReveal>

        {/* features as a numbered ledger */}
        <ScrollReveal className="mb-3.5">
          <section className="panel no-num" style={{ overflow: "hidden" }}>
            <div className="panel-head">
              <span className="panel-title">HOW THE MARKET WORKS</span>
              <span className="mono" style={{ fontSize: 10, color: "var(--dim)", letterSpacing: "0.1em" }}>
                5 RULES
              </span>
            </div>
            {FEATURES.map((f, i) => (
              <div key={f.title} className="ledger-row">
                <span className="ledger-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="mono" style={{ color: "var(--text)", fontSize: 12, letterSpacing: "0.1em", fontWeight: 600 }}>
                  {f.title}
                </span>
                <span style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>{f.desc}</span>
              </div>
            ))}
          </section>
        </ScrollReveal>

        {/* live feed teaser */}
        {tickerEvents && tickerEvents.length > 0 && (
          <ScrollReveal className="mb-8">
            <section className="panel no-num" style={{ overflow: "hidden" }}>
              <div className="panel-head">
                <span className="panel-title">LIVE MATCH FEED</span>
                <Link href="/ticker" className="link-up mono" style={{ fontSize: 11, letterSpacing: "0.1em" }}>
                  OPEN FULL FEED →
                </Link>
              </div>
              <div className="py-2">
                {tickerEvents.map((e, i) => (
                  <div
                    key={e.id}
                    className="grid items-center px-[18px] py-[9px]"
                    style={{ gridTemplateColumns: "1.6fr 1fr 0.8fr", borderBottom: i < tickerEvents.length - 1 ? "1px solid var(--border-soft)" : "none" }}
                  >
                    <span className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>
                      {e.role_label ?? "ENGINEER"}
                    </span>
                    <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                      {e.salary != null ? formatSalary(e.salary) : "—"}
                    </span>
                    {e.delta_pct != null ? (
                      <span
                        className="mono tnum"
                        style={{ fontSize: 12, color: e.delta_pct >= 0 ? "var(--up)" : "var(--down)", fontWeight: 600 }}
                      >
                        {e.delta_pct >= 0 ? "▲ +" : "▼ "}
                        {Math.abs(e.delta_pct).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="mono tnum" style={{ fontSize: 12, color: "var(--up)", fontWeight: 600 }}>
                        ▲ MATCH
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </ScrollReveal>
        )}
      </main>

      <footer className="flex items-center justify-between border-t border-border px-6 py-4">
        <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
          © {new Date().getFullYear()} THE JOB MARKET
        </span>
        <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
          HONG KONG · TECH VERTICAL ONLY IN BETA
        </span>
      </footer>
    </>
  );
}
