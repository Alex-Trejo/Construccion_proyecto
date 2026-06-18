/**
 * @fileoverview Validación de variables de entorno del frontend.
 *
 * A diferencia del backend (Fail-Fast estricto con Joi), aquí se ADVIERTE
 * en vez de crashear: el frontend (incluida la landing pública) debe poder
 * levantar siempre. Si faltan variables de Keycloak/NextAuth, solo la
 * autenticación dejará de funcionar — con un mensaje claro en logs.
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

  const missing = requiredServerVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    console.warn(
      `⚠️ [SGC] Variables de entorno del servidor faltantes — la autenticación ` +
        `con Keycloak NO funcionará hasta configurarlas:\n${missing
          .map((v) => `  - ${v}`)
          .join('\n')}`,
    );
  }

  return {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? '',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? '',
    KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID ?? '',
    KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET ?? '',
    KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER ?? '',
  };
}

/** Variables de entorno del cliente (prefijo NEXT_PUBLIC_). */
function getClientEnv() {
  const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;

  if (!apiGatewayUrl) {
    console.warn(
      '⚠️ [SGC] Falta NEXT_PUBLIC_API_GATEWAY_URL — las llamadas al API Gateway ' +
        'usarán la URL por defecto.',
    );
  }

  return {
    NEXT_PUBLIC_API_GATEWAY_URL:
      apiGatewayUrl ?? 'http://localhost:3000/api/v1',
  };
}

export const serverEnv = getServerEnv;
export const clientEnv = getClientEnv;
