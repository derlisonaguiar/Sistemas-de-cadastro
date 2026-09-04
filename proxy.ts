import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(
                name,
                value
              );
            }
          );

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({
              name,
              value,
              options,
            }) => {
              response.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const isAdminRoute =
    pathname.startsWith("/admin");

  const isAdministrativeApi =
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth/link") &&
    !pathname.startsWith("/api/auth/login") &&
    !pathname.startsWith("/api/health/");

  const isLoginRoute =
    pathname === "/login";

  if (
    (isAdminRoute || isAdministrativeApi) &&
    !user
  ) {
    if (isAdministrativeApi) {
      return NextResponse.json(
        { ok: false, message: "Não autenticado." },
        { status: 401 }
      );
    }
    const url =
      request.nextUrl.clone();

    url.pathname = "/login";

    return NextResponse.redirect(
      url
    );
  }

  if (
    isLoginRoute &&
    user
  ) {
    const url =
      request.nextUrl.clone();

    url.pathname = "/admin";

    return NextResponse.redirect(
      url
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/:path*",
    "/login",
  ],
};
