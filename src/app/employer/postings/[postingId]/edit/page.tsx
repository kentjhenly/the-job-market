import { notFound, redirect } from "next/navigation";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { EmployerJobPostingForm } from "../../EmployerJobPostingForm";
import { UpgradePanel } from "../../../feed/UpgradePanel";

export default async function EditJobPostingPage({
  params,
}: {
  params: Promise<{ postingId: string }>;
}) {
  const session = await getServerSession();
  if (!session) redirect("/sign-in");

  const { postingId } = await params;
  const supabase = getSupabaseServiceClient();

  const [{ data: posting }, { data: employer }] = await Promise.all([
    supabase
      .from("employer_job_postings")
      .select("*")
      .eq("id", postingId)
      .eq("employer_id", session.user.id)
      .single(),
    supabase
      .from("employers")
      .select("subscription_tier, subscription_status")
      .eq("id", session.user.id)
      .single(),
  ]);

  if (!posting) notFound();

  if (employer?.subscription_status !== "active") {
    return (
      <UpgradePanel
        status={employer?.subscription_status ?? "canceled"}
      />
    );
  }

  return <EmployerJobPostingForm initial={posting} />;
}
