import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { ResendVerificationButton } from "./ResendVerificationButton";

export default async function VerifyEmailPage() {
  const session = await getServerSession();
  if (!session) redirect("/sign-in");

  const role = (session.user as { role?: string }).role;
  if (role !== "employer") redirect("/candidate/terminal");
  if (session.user.emailVerified) redirect("/employer/terminal");

  return (
    <div className="panel p-8">
      <div className="mb-6">
        <h1 className="mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--up)", letterSpacing: "0.04em" }}>
          VERIFY YOUR EMAIL
        </h1>
      </div>

      <p className="mono mb-6" style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
        We sent a verification link to{" "}
        <strong style={{ color: "var(--text)" }}>{session.user.email}</strong>. Click the link to
        activate your employer account and access the candidate feed.
      </p>

      <ResendVerificationButton email={session.user.email} />
    </div>
  );
}
