// middleware.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Add pathname header for Server Components (MarketingNav)
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  // Only protect these areas
  const isProtected =
    pathname.startsWith("/app/dashboard") ||
    pathname.startsWith("/organizer/create") ||
    pathname.startsWith("/organizer") ||
    pathname.startsWith("/community") ||
    pathname.startsWith("/saved");

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Organizer-only areas
  const role = (req.auth?.user as any)?.role;
  if (
    (pathname.startsWith("/organizer/create") || pathname.startsWith("/organizer")) &&
    role !== "ORGANIZER"
  ) {
    return NextResponse.redirect(new URL("/app/dashboard", req.url));
  }

  // IMPORTANT: pass the modified headers
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
});

export const config = {
  matcher: [
    "/app/dashboard/:path*",
    "/organizer/create/:path*",
    "/organizer/:path*",
    "/community/:path*",
    "/saved/:path*",
  ],
};
