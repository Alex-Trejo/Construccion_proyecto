/**
 * @fileoverview Configuración de Fail-Fast para variables de entorno del frontend.
 *
 * Valida en tiempo de build que TODAS las variables de entorno requeridas
 * estén presentes. Si alguna falta, Next.js crashea inmediatamente.
 *
 * @module env
 */

/** Variables de entorno del servidor (solo accesibles en server components / API routes). */
function getServerEnv() {
  const requiredServerVars = [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'KEYCLOAK_CLIENT_ID',
    'KEYCLOAK_CLIENT_SECRET',
    'KEYCLOAK_ISSUER',
  ] as const;

  const missing: string[] = [];

  for (const varName of requiredServerVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `❌ [Fail-Fast] Variables de entorno faltantes:\n${missing.map((v) => `  - ${v}`).join('\n')}`,
    );
  }

  return {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL as string,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET as string,
    KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID as string,
    KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET as string,
    KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER as string,
  };
}

/** Variables de entorno del cliente (prefijo NEXT_PUBLIC_). */
function getClientEnv() {
  const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;

  if (!apiGatewayUrl) {
    throw new Error(
      '❌ [Fail-Fast] Variable de entorno faltante: NEXT_PUBLIC_API_GATEWAY_URL',
    );
  }

  return {
    NEXT_PUBLIC_API_GATEWAY_URL: apiGatewayUrl,
  };
}

export const serverEnv = getServerEnv;
export const clientEnv = getClientEnv;
