import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { parseBody } from "@/lib/utils/api";
import { salarySchema } from "@/lib/utils/schemas";

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(request, salarySchema);
  if (!parsed.ok) return parsed.response;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/salary-regression`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    }
  );

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
