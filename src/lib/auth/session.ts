import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "./auth";

// Deduped per request: a single navigation resolves the session in the proxy,
// the layout, and the page. React.cache() collapses those into one resolution
// per render pass, and the cookie cache in auth.ts keeps that resolution off
// the database in the common case.
export const getServerSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

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
