import { redirect } from "next/navigation";
import { TopBar } from "@/components/terminal/TopBar";
import { Sidebar, MobileNav } from "@/components/terminal/Sidebar";
import { MatchTickerTapeLazy as MatchTickerTape } from "@/components/terminal/MatchTickerTapeLazy";
import { CommandBar } from "@/components/terminal/CommandBar";
import { StatusBar } from "@/components/terminal/StatusBar";
import { CommandHelpModal } from "@/components/terminal/CommandHelpModal";
import { CommandConsoleProvider } from "@/components/terminal/CommandConsoleContext";
import { CANDIDATE_COMMANDS, CANDIDATE_FKEYS } from "@/lib/utils/commands";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/candidate/terminal", label: "TERMINAL" },
  { href: "/candidate/portfolio", label: "PORTFOLIO" },
  { href: "/candidate/postings", label: "POSTINGS" },
  { href: "/candidate/matches", label: "PITCHES" },
  { href: "/candidate/settings", label: "SETTINGS" },
];

export default async function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) redirect("/sign-in");

  const role = (session.user as { role?: string }).role;
  if (role !== "candidate") redirect("/employer/terminal");

  const supabase = getSupabaseServiceClient();
  const { data: candidate } = await supabase
    .from("candidates")
    .select("composite_score")
    .eq("id", session.user.id)
    .single();

  // The full name from account creation (Better Auth user.name), not the
  // editable display_name.
  const accountName = session.user.name;

  return (
    <CommandConsoleProvider>
      <div className="flex h-screen flex-col" style={{ background: "var(--bg)" }}>
        <TopBar
          homeHref="/candidate/terminal"
          stat={{ label: "SCORE", value: (candidate?.composite_score ?? 0).toFixed(1) }}
        />
        <CommandBar commands={CANDIDATE_COMMANDS} />
        <MatchTickerTape />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Sidebar nav={NAV} role="candidate" label={accountName || undefined} />
          <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
        </div>

        <MobileNav nav={NAV} />
        <StatusBar fkeys={CANDIDATE_FKEYS} />
      </div>
      <CommandHelpModal commands={CANDIDATE_COMMANDS} />
    </CommandConsoleProvider>
  );
}
