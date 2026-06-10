import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="panel p-8">
      <div className="mb-6">
        <h1 className="mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--up)", letterSpacing: "0.04em" }}>
          JOIN THE MARKET
        </h1>
        <p className="kicker mt-1">SELECT YOUR ROLE TO BEGIN</p>
      </div>

      <div className="space-y-4">
        <Link href="/sign-up/candidate" className="group block">
          <div
            className="rounded-lg border border-border p-6 transition-colors hover:border-up"
            style={{ background: "var(--surface-2)" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="mono" style={{ fontSize: 13, letterSpacing: "0.12em", color: "var(--text)", fontWeight: 700 }}>
                  CANDIDATE
                </h2>
                <p className="mt-2" style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                  Complete skill challenges. Get ranked by ability.
                  <br />
                  Let employers come to you.
                </p>
              </div>
              <span className="mono transition-colors group-hover:text-up" style={{ fontSize: 18, color: "var(--muted)" }}>
                →
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <span className="badge badge-up">FREE TO JOIN</span>
              <span className="badge badge-muted">PAY ON MATCH</span>
            </div>
          </div>
        </Link>

        <Link href="/sign-up/employer" className="group block">
          <div
            className="rounded-lg border border-border p-6 transition-colors hover:border-up"
            style={{ background: "var(--surface-2)" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="mono" style={{ fontSize: 13, letterSpacing: "0.12em", color: "var(--text)", fontWeight: 700 }}>
                  EMPLOYER
                </h2>
                <p className="mt-2" style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                  Browse a ranked feed of verified talent.
                  <br />
                  Pitch the candidates you want. Pay per match.
                </p>
              </div>
              <span className="mono transition-colors group-hover:text-up" style={{ fontSize: 18, color: "var(--muted)" }}>
                →
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <span className="badge badge-up">FREE TO BROWSE</span>
              <span className="badge badge-muted">PAY PER PITCH</span>
            </div>
          </div>
        </Link>
      </div>

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
