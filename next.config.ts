import type { NextConfig } from "next";

// Derive the Supabase origin so the CSP can allow API + Realtime (wss) traffic
// to it without opening up to all hosts.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
let supabaseOrigin = "";
let supabaseWsOrigin = "";
try {
  if (supabaseUrl) {
    const u = new URL(supabaseUrl);
    supabaseOrigin = u.origin;
    supabaseWsOrigin = `wss://${u.host}`;
  }
} catch {
  // Invalid/empty URL — leave the CSP without an explicit Supabase entry.
}

// Content-Security-Policy. Next.js App Router injects inline bootstrap scripts
// and the app uses inline styles throughout, so 'unsafe-inline' is required for
// script/style; 'unsafe-eval' is needed for the dev/Turbopack runtime. The
// hardening that matters most here is locking down object-src, base-uri,
// frame-ancestors and form-action, plus constraining connect/img sources.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "frame-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.posthog.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://s.wordpress.com" + (supabaseOrigin ? ` ${supabaseOrigin}` : ""),
  `connect-src 'self' https://*.posthog.com${supabaseOrigin ? ` ${supabaseOrigin} ${supabaseWsOrigin}` : ""}`,
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Don't leak the framework/version to clients.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
