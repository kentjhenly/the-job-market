import { redirect } from "next/navigation";
import { TopBar } from "@/components/terminal/TopBar";
import { Sidebar } from "@/components/terminal/Sidebar";
import { MatchTickerTape } from "@/components/terminal/MatchTickerTape";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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

  const supabase = await getSupabaseServerClient();
  const { data: candidate } = await supabase
    .from("candidates")
    .select("composite_score")
    .eq("id", session.user.id)
    .single();

  return (
    <div className="flex h-screen flex-col" style={{ background: "var(--bg)" }}>
      <TopBar
        homeHref="/dashboard"
        stat={{ label: "SCORE", value: (candidate?.composite_score ?? 0).toFixed(1) }}
      />
      <MatchTickerTape />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar nav={NAV} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
