import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("yacelltech_token")?.value;
  const { pathname } = request.nextUrl;

  // 1. Excluir archivos estáticos internos de Next.js y endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") // favicon.ico, manifest, etc.
  ) {
    return NextResponse.next();
  }

  // 2. Excluir específicamente las rutas públicas de recibos y conduces
  if (pathname.startsWith("/receipt") || pathname.startsWith("/conduce")) {
    return NextResponse.next();
  }

  // 3. Rutas protegidas vs Ruta de autenticación
  const isProtectedRoute = pathname === "/" || pathname.startsWith("/dashboard");
  const isAuthRoute = pathname === "/login";

  // Redirigir al login si intenta acceder a una ruta privada sin token
  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Redirigir al inicio (intake form) si ya está autenticado e intenta ir a /login
  if (isAuthRoute && token) {
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Ejecutar el middleware en todas las rutas principales del sitio
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
