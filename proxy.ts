// proxy.ts (project root)
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  const isProtected =
    pathname.startsWith("/app/dashboard") ||
    pathname.startsWith("/app/organizer/create") ||
    pathname.startsWith("/app/organizer") ||
    pathname.startsWith("/app/community") ||
    pathname.startsWith("/app/saved") ||
    pathname.startsWith("/app/cart") ||      // ✅ NEW
    pathname.startsWith("/app/profile");     // ✅ NEW

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  if (isProtected && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
