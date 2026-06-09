import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { SalaryPageClient } from "./SalaryPageClient";

export default async function SalaryPage() {
  const session = await getServerSession();
  const supabase = await getSupabaseServerClient();
  if (!session) return null;

  const { data: candidate } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", session.user.id)
    .single();

  return <SalaryPageClient candidate={candidate} />;
}
