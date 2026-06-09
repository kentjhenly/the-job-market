import { redirect } from "next/navigation";
import Link from "next/link";
import { TerminalHeader } from "@/components/terminal/TerminalHeader";
import { MatchTickerTape } from "@/components/terminal/MatchTickerTape";
import { getServerSession } from "@/lib/auth/session";

const NAV = [
  { href: "/dashboard", label: "DASHBOARD" },
  { href: "/challenges", label: "CHALLENGES" },
  { href: "/salary", label: "SALARY" },
  { href: "/matches", label: "PITCHES" },
  { href: "/profile", label: "PROFILE" },
];

export default async function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) redirect("/sign-in");

  const role = (session.user as { role?: string }).role;
  if (role !== "candidate") redirect("/employer/dashboard");

  return (
    <div className="flex flex-col h-screen bg-bg">
      <TerminalHeader role="candidate" />
      <MatchTickerTape />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-44 bg-surface border-r border-border flex flex-col shrink-0">
          <nav className="flex flex-col pt-2">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-4 py-3 font-mono text-xs text-muted hover:text-green hover:bg-bg transition-colors tracking-widest border-b border-border"
              >
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
