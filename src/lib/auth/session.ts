import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "./auth";

// Deduped per request: a single navigation resolves the session in the proxy,
// the layout, and the page. React.cache() collapses those into one resolution
// per render pass, and the cookie cache in auth.ts keeps that resolution off
// the database in the common case.
export const getServerSession = cache(async () => {
  const reqHeaders = await headers();
  // Transient DB errors (connect timeout / ECONNRESET from the Supabase pooler)
  // should not crash the layout render or bounce a signed-in user. Retry once
  // against a fresh connection before giving up; returning null then triggers
  // the normal unauthenticated redirect to /sign-in.
  for (let attempt = 0; ; attempt++) {
    try {
      return await auth.api.getSession({ headers: reqHeaders });
    } catch {
      if (attempt < 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }
      return null;
    }
  }
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
