"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { PostHog } from "posthog-js";

// posthog-js is ~60KB and only needed for analytics, which never blocks the
// UI. Load it with a dynamic import() after hydration so it splits into its
// own chunk instead of weighing down the initial bundle of every page.
let initPromise: Promise<PostHog | null> | null = null;

function loadPostHog(): Promise<PostHog | null> {
  if (initPromise) return initPromise;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    initPromise = Promise.resolve(null);
    return initPromise;
  }
  initPromise = import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
      capture_pageview: false,
      persistence: "localStorage",
    });
    return posthog;
  });
  return initPromise;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    void loadPostHog();
  }, []);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    void loadPostHog().then((posthog) =>
      posthog?.capture("$pageview", { $current_url: window.location.href })
    );
  }, [pathname]);

  return <>{children}</>;
}
