import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const CANDIDATE_ROUTES = ["/dashboard", "/challenges", "/salary", "/matches", "/profile"];
const EMPLOYER_ROUTES = ["/employer"];
const PUBLIC_ROUTES = ["/", "/sign-in", "/sign-up", "/ticker", "/api/auth"];

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

  let response = NextResponse.next({
    request,
  });

  // Refresh Supabase session cookie
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users from protected routes
  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  // Role-based routing for authenticated users
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;

    if (role === "employer" && CANDIDATE_ROUTES.some((r) => pathname.startsWith(r))) {
      const url = request.nextUrl.clone();
      url.pathname = "/employer/dashboard";
      return NextResponse.redirect(url);
    }

    if (role === "candidate" && pathname.startsWith("/employer")) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Redirect authenticated users away from auth pages
    if (pathname === "/sign-in" || pathname === "/sign-up") {
      const url = request.nextUrl.clone();
      url.pathname = role === "employer" ? "/employer/dashboard" : "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
