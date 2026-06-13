import { redirect } from "next/navigation";
import { TopBar } from "@/components/terminal/TopBar";
import { Sidebar } from "@/components/terminal/Sidebar";
import { MatchTickerTape } from "@/components/terminal/MatchTickerTape";
import { CommandBar } from "@/components/terminal/CommandBar";
import { StatusBar } from "@/components/terminal/StatusBar";
import { CommandHelpModal } from "@/components/terminal/CommandHelpModal";
import { CommandConsoleProvider } from "@/components/terminal/CommandConsoleContext";
import { CANDIDATE_COMMANDS, CANDIDATE_FKEYS } from "@/lib/utils/commands";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/candidate/dashboard", label: "DASHBOARD" },
  { href: "/candidate/portfolio", label: "PORTFOLIO" },
  { href: "/candidate/postings", label: "POSTINGS" },
  { href: "/candidate/matches", label: "PITCHES" },
  { href: "/candidate/profile", label: "PROFILE" },
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

  const supabase = getSupabaseServiceClient();
  const { data: candidate } = await supabase
    .from("candidates")
    .select("composite_score, credits")
    .eq("id", session.user.id)
    .single();

  return (
    <CommandConsoleProvider>
      <div className="flex h-screen flex-col" style={{ background: "var(--bg)" }}>
        <TopBar
          homeHref="/candidate/dashboard"
          stat={[
            { label: "SCORE", value: (candidate?.composite_score ?? 0).toFixed(1) },
            { label: "CREDITS", value: String(candidate?.credits ?? 0) },
          ]}
        />
        <CommandBar commands={CANDIDATE_COMMANDS} />
        <MatchTickerTape />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar nav={NAV} role="candidate" />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>

        <StatusBar fkeys={CANDIDATE_FKEYS} />
      </div>
      <CommandHelpModal commands={CANDIDATE_COMMANDS} />
    </CommandConsoleProvider>
  );
}
