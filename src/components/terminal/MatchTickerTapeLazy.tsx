"use client";

import dynamic from "next/dynamic";

// The ticker pulls in the Supabase realtime client, which is one of the
// heaviest dependencies in the app. It renders nothing until its data loads
// (a decorative marquee), so defer it out of the initial bundle: ssr:false
// loads its chunk (and the Supabase client) only after hydration. No visual
// regression, since SSR never rendered anything for it anyway.
const MatchTickerTape = dynamic(
  () => import("./MatchTickerTape").then((m) => m.MatchTickerTape),
  { ssr: false }
);

export function MatchTickerTapeLazy({ className }: { className?: string }) {
  return <MatchTickerTape className={className} />;
}
