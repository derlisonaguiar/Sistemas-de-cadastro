import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // Legacy private files must never be served from the public directory.
  if (request.nextUrl.pathname === "/uploads" || request.nextUrl.pathname.startsWith("/uploads/")) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  const pathname =
    request.nextUrl.pathname;

  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
  if (pathname.startsWith("/api/") && isMutation) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    let sameOrigin = false;

    try {
      sameOrigin = Boolean(origin && host && new URL(origin).host === host);
    } catch {
      sameOrigin = false;
    }

    if (!sameOrigin) {
      return NextResponse.json(
        { ok: false, message: "Origem da requisição não autorizada." },
        { status: 403 }
      );
    }
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/uploads/:path*",
    "/admin/:path*",
    "/api/:path*",
    "/login",
    "/inscricao",
    "/vincular",
  ],
};
