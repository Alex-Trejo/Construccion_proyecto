/**
 * @fileoverview Proxy de Next.js — Protección de rutas (antes "middleware").
 *
 * En Next.js 16 la convención `middleware` fue renombrada a `proxy` y exige
 * exportar una función (default o `proxy`). Aquí se protege `/dashboard/*`:
 * si no existe cookie de sesión de NextAuth, redirige al sign-in.
 *
 * Nota (Fase B — Auth): la validación fina del JWT/roles se realiza en el
 * API Gateway. Este proxy solo hace el gating de presencia de sesión.
 *
 * @see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
 * @module proxy
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Cookies de sesión que NextAuth establece (http y https). */
const SESSION_COOKIES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
] as const;

export function proxy(request: NextRequest): NextResponse {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));

  if (!hasSession) {
    // Sin sesión → a la landing pública, que ofrece el login con Keycloak.
    const landingUrl = new URL('/', request.url);
    landingUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(landingUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
