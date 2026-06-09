import { headers } from "next/headers";
import { auth } from "./auth";

export async function getServerSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireSession() {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireRole(role: "candidate" | "employer") {
  const session = await requireSession();
  const userRole = (session.user as { role?: string }).role;
  if (userRole !== role) {
    throw new Error("Forbidden");
  }
  return session;
}
