import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_ROUTES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/terms",
  "/ticker",
  "/api/auth",
  // Stripe calls this server-to-server with no session cookie; it verifies the
  // request itself via the STRIPE_WEBHOOK_SECRET signature.
  "/api/subscription/webhook",
];

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/") || pathname.startsWith("/sign-up")
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static files and API routes (except auth) pass through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/fonts") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Optimistic check: presence of Better Auth's session cookie. The
  // authoritative session + role checks happen in the candidate and
  // employer layouts via getServerSession().
  const sessionToken = getSessionCookie(request);

  // Redirect unauthenticated users from protected routes
  if (!sessionToken && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from the sign-in page (this is what
  // makes "SIGN IN" act as "go to my dashboard" when already logged in).
  // /sign-up* stays reachable while authenticated, so a logged-in user can
  // register an alternate (e.g. opposite-role) account without being signed
  // out first — the existing session is only replaced once that signup
  // succeeds.
  if (sessionToken && pathname === "/sign-in") {
    const url = request.nextUrl.clone();
    url.pathname = "/candidate/terminal";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
