import { NextRequest, NextResponse } from "next/server";

import { auth } from "./lib/auth";

/**
 * Reached without a session: sign-in, the candidate's pages, the guide and
 * the OAuth metadata documents.
 */
const PUBLIC_PREFIXES = ["/auth", "/recruiting", "/guida", "/.well-known"];

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  const { pathname } = request.nextUrl;

  // Root path handling: redirect authenticated users to dashboard
  if (pathname === "/") {
    return session?.user
      ? NextResponse.redirect(new URL("/dashboard", request.url))
      : NextResponse.next();
  }

  // Protected routes: if user is not authenticated and not in a public path, redirect
  if (
    !session?.user &&
    !PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    // Preserve the intended destination for redirect after login
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Allow request to continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|api|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
