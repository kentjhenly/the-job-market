"use client";

import { useSession as useBetterAuthSession } from "@/lib/auth/auth-client";

export function useSession() {
  const { data, isPending } = useBetterAuthSession();

  return {
    session: data,
    user: data?.user ?? null,
    role: (data?.user as { role?: string } | undefined)?.role as
      | "candidate"
      | "employer"
      | undefined,
    loading: isPending,
  };
}
