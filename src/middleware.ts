import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/today", "/trends", "/progress", "/profile", "/coach", "/onboarding", "/devices", "/watch"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsSession = PROTECTED.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (!needsSession) return finish(NextResponse.next());
  const hasSession = request.cookies.getAll().some((cookie) => (
    cookie.name.endsWith("better-auth.session_token") && cookie.value.length >= 16
  ));
  const response = hasSession ? NextResponse.next() : NextResponse.redirect(signInUrl(request, pathname));
  return finish(response);
}

function finish(response: NextResponse) {
  if (process.env.VERCEL === "1") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return response;
}

function signInUrl(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/sign-in";
  url.searchParams.set("next", pathname);
  return url;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
