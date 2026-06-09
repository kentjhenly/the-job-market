import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="border border-border bg-surface p-8">
      <div className="mb-6">
        <h1 className="font-mono text-green text-lg tracking-wide">JOIN THE MARKET</h1>
        <p className="text-muted text-xs font-mono mt-1">SELECT YOUR ROLE TO BEGIN</p>
      </div>

      <div className="space-y-4">
        <Link href="/sign-up/candidate" className="block group">
          <div className="border border-border hover:border-green bg-bg p-6 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-mono text-white text-sm tracking-widest group-hover:text-green transition-colors">
                  CANDIDATE
                </h2>
                <p className="text-muted text-xs font-mono mt-2 leading-relaxed">
                  Complete skill challenges. Get ranked by ability.
                  <br />
                  Let employers come to you.
                </p>
              </div>
              <span className="font-mono text-muted text-lg group-hover:text-green transition-colors">
                →
              </span>
            </div>
            <div className="mt-4 flex gap-4">
              <span className="text-green text-xs font-mono">FREE TO JOIN</span>
              <span className="text-muted text-xs font-mono">PAY ON MATCH</span>
            </div>
          </div>
        </Link>

        <Link href="/sign-up/employer" className="block group">
          <div className="border border-border hover:border-green bg-bg p-6 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-mono text-white text-sm tracking-widest group-hover:text-green transition-colors">
                  EMPLOYER
                </h2>
                <p className="text-muted text-xs font-mono mt-2 leading-relaxed">
                  Browse a ranked feed of verified talent.
                  <br />
                  Pitch the candidates you want. Pay per match.
                </p>
              </div>
              <span className="font-mono text-muted text-lg group-hover:text-green transition-colors">
                →
              </span>
            </div>
            <div className="mt-4 flex gap-4">
              <span className="text-green text-xs font-mono">FREE TO BROWSE</span>
              <span className="text-muted text-xs font-mono">PAY PER PITCH</span>
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-6 pt-6 border-t border-border text-center">
        <p className="text-muted text-xs font-mono">
          ALREADY HAVE AN ACCOUNT?{" "}
          <Link href="/sign-in" className="text-green hover:underline">
            SIGN IN
          </Link>
        </p>
      </div>
    </div>
  );
}
