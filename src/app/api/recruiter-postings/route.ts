import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { FREE_JOB_POSTINGS } from "@/lib/utils/constants";
import { validateEmployerPosting } from "@/lib/utils/postingValidation";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("employer_job_postings")
    .select("*")
    .eq("employer_id", session.user.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ postings: data });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "employer") {
    return NextResponse.json({ error: "Recruiters only" }, { status: 403 });
  }

  const supabase = getSupabaseServiceClient();
  const body = await request.json();

  const validated = validateEmployerPosting(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const fields = validated.value;

  const { data: employer, error: employerError } = await supabase
    .from("employers")
    .select("subscription_status")
    .eq("id", session.user.id)
    .single();

  if (employerError || !employer) {
    return NextResponse.json({ error: "Recruiter profile not found" }, { status: 404 });
  }

  // First FREE_JOB_POSTINGS postings are a free trial, regardless of
  // subscription status. Beyond that, an active subscription is required for
  // unlimited postings.
  // TODO(stripe): subscription_status is manually-settable until billing is
  // wired up. A Stripe webhook (customer.subscription.updated/.deleted)
  // should keep employers.subscription_status/subscription_tier/
  // subscription_period_end in sync going forward.
  if (employer.subscription_status !== "active") {
    const { count: postingCount } = await supabase
      .from("employer_job_postings")
      .select("id", { count: "exact", head: true })
      .eq("employer_id", session.user.id);

    if ((postingCount ?? 0) >= FREE_JOB_POSTINGS) {
      return NextResponse.json(
        {
          error: `Free trial limit reached (${FREE_JOB_POSTINGS} job postings). An active subscription is required for unlimited postings.`,
        },
        { status: 402 }
      );
    }
  }

  const { data, error } = await supabase
    .from("employer_job_postings")
    .insert({
      employer_id: session.user.id,
      title: fields.title,
      description: fields.description,
      vertical: body.vertical ?? "tech",
      years_exp_min: fields.years_exp_min,
      years_exp_max: fields.years_exp_max,
      location: body.location ?? null,
      work_modes: body.work_modes ?? [],
      salary_min: fields.salary_min,
      salary_max: fields.salary_max,
      skills: fields.skills,
      max_candidates: fields.max_candidates,
      status: body.status ?? "open",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id });
}
