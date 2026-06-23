import { redirect } from "next/navigation";
import { TopBar } from "@/components/terminal/TopBar";
import { Sidebar, MobileNav } from "@/components/terminal/Sidebar";
import { MatchTickerTapeLazy as MatchTickerTape } from "@/components/terminal/MatchTickerTapeLazy";
import { CommandBar } from "@/components/terminal/CommandBar";
import { StatusBar } from "@/components/terminal/StatusBar";
import { CommandHelpModal } from "@/components/terminal/CommandHelpModal";
import { CommandConsoleProvider } from "@/components/terminal/CommandConsoleContext";
import { EMPLOYER_COMMANDS, EMPLOYER_FKEYS } from "@/lib/utils/commands";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { repVar } from "@/lib/utils/score";

const NAV = [
  { href: "/employer/terminal", label: "TERMINAL" },
  { href: "/employer/feed", label: "FEED" },
  { href: "/employer/postings", label: "OPENINGS" },
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
  if (role !== "employer") redirect("/candidate/terminal");

  // SHELVED while running locally — employer email verification gate. Do not
  // delete; re-enable (with the emailVerification config in src/lib/auth/auth.ts)
  // for production.
  // if (!session.user.emailVerified) redirect("/verify-email");

  const supabase = getSupabaseServiceClient();
  const { data: employer } = await supabase
    .from("employers")
    .select("subscription_tier, reputation_score, company_name")
    .eq("id", session.user.id)
    .single();

  return (
    <CommandConsoleProvider>
      <div className="flex h-screen flex-col" style={{ background: "var(--bg)" }}>
        <TopBar
          homeHref="/employer/terminal"
          stat={[
            { label: "PLAN", value: (employer?.subscription_tier ?? "none").toUpperCase(), ...((employer?.subscription_tier ?? "none") === "none" ? { href: "/employer/feed" } : {}) },
            { label: "REPUTATION", value: `${(employer?.reputation_score ?? 100).toFixed(0)}/100`, color: repVar(employer?.reputation_score ?? 100) },
          ]}
        />
        <CommandBar commands={EMPLOYER_COMMANDS} />
        <MatchTickerTape />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Sidebar nav={NAV} role="employer" label={employer?.company_name?.toUpperCase() || undefined} />
          <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
        </div>

        <MobileNav nav={NAV} />
        <StatusBar fkeys={EMPLOYER_FKEYS} />
      </div>
      <CommandHelpModal commands={EMPLOYER_COMMANDS} />
    </CommandConsoleProvider>
  );
}
