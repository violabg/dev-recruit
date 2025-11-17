import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const callbackURL =
    searchParams.get("next") || searchParams.get("callbackURL") || "/";

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
