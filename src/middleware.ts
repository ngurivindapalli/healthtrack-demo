import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE, demoRuntime } from "@/lib/demo/config";

const PROTECTED = ["/today", "/trends", "/progress", "/profile", "/coach", "/onboarding", "/devices", "/watch"];

export function middleware(request: NextRequest) {
  const runtime = demoRuntime();
  if (runtime === "forbidden") {
    return new NextResponse("Demo Mode is disabled on production deployments.", { status: 503 });
  }
  const { pathname } = request.nextUrl;
  if (runtime === "on" && pathname.startsWith("/api/") && pathname !== "/api/demo" && pathname !== "/api/demo/session" && pathname !== "/api/v1/config") {
    const headers = new Headers(request.headers);
    headers.set("x-healthtrack-demo-path", `${pathname}${request.nextUrl.search}`);
    return finish(NextResponse.rewrite(new URL("/api/demo", request.url), { request: { headers } }));
  }
  const needsSession = PROTECTED.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (!needsSession) return finish(NextResponse.next());
  if (runtime === "on") {
    const demoSession = request.cookies.get(DEMO_COOKIE)?.value === "active";
    const response = demoSession ? NextResponse.next() : NextResponse.redirect(signInUrl(request, pathname));
    return finish(response);
  }
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
