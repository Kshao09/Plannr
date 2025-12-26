// middleware.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isLoggedIn = !!req.auth;

  // Only protect these areas
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/create") ||
    pathname.startsWith("/organizer");

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Organizer-only areas
  const role = req.auth?.user?.role;
  if ((pathname.startsWith("/create") || pathname.startsWith("/organizer")) && role !== "ORGANIZER") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/create/:path*", "/organizer/:path*"],
};
