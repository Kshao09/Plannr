// proxy.ts (project root)
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Add pathname header for Server Components
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  const isProtected =
    pathname.startsWith("/app/dashboard") ||
    pathname.startsWith("/app/organizer/create") ||
    pathname.startsWith("/app/organizer") ||
    pathname.startsWith("/app/community") ||
    pathname.startsWith("/app/saved");

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET, // make sure this exists in .env.local
  });

  if (isProtected && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    (pathname.startsWith("/app/organizer/create") || pathname.startsWith("/app/organizer")) &&
    (token as any)?.role !== "ORGANIZER"
  ) {
    return NextResponse.redirect(new URL("/app/dashboard", req.url));
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
