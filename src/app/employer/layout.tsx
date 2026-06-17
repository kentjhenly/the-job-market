import { redirect } from "next/navigation";
import { TopBar } from "@/components/terminal/TopBar";
import { Sidebar } from "@/components/terminal/Sidebar";
import { MatchTickerTape } from "@/components/terminal/MatchTickerTape";
import { CommandBar } from "@/components/terminal/CommandBar";
import { StatusBar } from "@/components/terminal/StatusBar";
import { CommandHelpModal } from "@/components/terminal/CommandHelpModal";
import { CommandConsoleProvider } from "@/components/terminal/CommandConsoleContext";
import { EMPLOYER_COMMANDS, EMPLOYER_FKEYS } from "@/lib/utils/commands";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/employer/dashboard", label: "DASHBOARD" },
  { href: "/employer/feed", label: "FEED" },
  { href: "/employer/postings", label: "POSTINGS" },
  { href: "/employer/matches", label: "PITCHES" },
  { href: "/employer/settings", label: "SETTINGS" },
];

export default async function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) redirect("/sign-in");

  const role = (session.user as { role?: string }).role;
  if (role !== "employer") redirect("/candidate/dashboard");

  // SHELVED while running locally — employer email verification gate. Do not
  // delete; re-enable (with the emailVerification config in src/lib/auth/auth.ts)
  // for production.
  // if (!session.user.emailVerified) redirect("/verify-email");

  const supabase = getSupabaseServiceClient();
  const { data: employer } = await supabase
    .from("employers")
    .select("subscription_tier, reputation_score")
    .eq("id", session.user.id)
    .single();

  return (
    <CommandConsoleProvider>
      <div className="flex h-screen flex-col" style={{ background: "var(--bg)" }}>
        <TopBar
          homeHref="/employer/dashboard"
          stat={[
            { label: "PLAN", value: (employer?.subscription_tier ?? "none").toUpperCase() },
            { label: "REPUTATION", value: `${(employer?.reputation_score ?? 100).toFixed(0)}/100` },
          ]}
        />
        <CommandBar commands={EMPLOYER_COMMANDS} />
        <MatchTickerTape />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar nav={NAV} role="employer" />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>

        <StatusBar fkeys={EMPLOYER_FKEYS} />
      </div>
      <CommandHelpModal commands={EMPLOYER_COMMANDS} />
    </CommandConsoleProvider>
  );
}
