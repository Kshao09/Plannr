// middleware.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Add pathname header for Server Components (MarketingNav, AppLayout, etc.)
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  // ✅ FIX: your app routes are /app/...
  const isProtected =
    pathname.startsWith("/app/dashboard") ||
    pathname.startsWith("/app/organizer/create") ||
    pathname.startsWith("/app/organizer") ||
    pathname.startsWith("/app/community") ||
    pathname.startsWith("/app/saved");

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Organizer-only areas
  const role = (req.auth?.user as any)?.role;
  if (
    (pathname.startsWith("/app/organizer/create") || pathname.startsWith("/app/organizer")) &&
    role !== "ORGANIZER"
  ) {
    return NextResponse.redirect(new URL("/app/dashboard", req.url));
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
});

// ✅ Run middleware on all pages so x-pathname is always available
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
