import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { SalaryPageClient } from "./SalaryPageClient";

export default async function SalaryPage() {
  const session = await getServerSession();
  if (!session) return null;
  const supabase = getSupabaseServiceClient();

  const { data: candidate } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", session.user.id)
    .single();

  return <SalaryPageClient candidate={candidate} />;
}
