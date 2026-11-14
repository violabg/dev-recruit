import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Reduce a caller-supplied redirect target to a path on this origin.
 * Anything pointing elsewhere falls back to "/", so the verification link
 * cannot be used as an open redirect.
 */
function toSameOriginPath(requested: string | null, requestUrl: string) {
  if (!requested) return "/";
  try {
    const base = new URL(requestUrl);
    const target = new URL(requested, base);
    if (target.origin !== base.origin) return "/";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/";
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const callbackURL = toSameOriginPath(
    searchParams.get("next") || searchParams.get("callbackURL"),
    request.url
  );

  if (!token) {
    const errorURL = new URL("/auth/error", request.url);
    errorURL.searchParams.set("error", "Token mancante");
    return NextResponse.redirect(errorURL);
  }

  try {
    await auth.api.verifyEmail({
      headers: request.headers,
      query: {
        token,
        callbackURL,
      },
    });
    const target = new URL(callbackURL, request.url);
    return NextResponse.redirect(target);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Verifica dell'email fallita";
    const errorURL = new URL("/auth/error", request.url);
    errorURL.searchParams.set("error", message);
    return NextResponse.redirect(errorURL);
  }
}
