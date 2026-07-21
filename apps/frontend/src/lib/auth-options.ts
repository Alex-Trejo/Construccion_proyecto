/**
 * @fileoverview Configuración NextAuth — Keycloak Provider.
 *
 * Configura autenticación delegada a Keycloak:
 *   - El access_token de Keycloak se guarda en la sesión de NextAuth.
 *   - El frontend usa ese token para autenticar peticiones al api-gateway.
 *
 * Callbacks:
 *   - jwt: Captura access_token y refresh_token de Keycloak.
 *   - session: Expone access_token en session para uso en el cliente.
 *
 * @module auth-options
 */

import type { AuthOptions } from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';
import { serverEnv } from './env';

// Fail-Fast: valida en el arranque del servidor que TODAS las variables
// requeridas (NextAuth + Keycloak) existan. Si falta una, lanza y crashea.
serverEnv();

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    /** Roles del realm de Keycloak (realm_access.roles), para gating de UI. */
    roles?: string[];
    /** 'RefreshAccessTokenError' si el refresco falló → forzar re-login. */
    error?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    /** Expiración del access_token en segundos (epoch). */
    expiresAt?: number;
    roles?: string[];
    error?: string;
  }
}

/**
 * Decodifica el payload de un JWT (sin verificar la firma — el token proviene
 * de Keycloak vía OIDC y ya fue validado por NextAuth) y extrae los roles del
 * realm (`realm_access.roles`). El backend vuelve a validar en cada petición.
 */
function extractRealmRoles(accessToken: string | undefined): string[] {
  if (!accessToken) return [];
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return [];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(normalized, 'base64').toString('utf-8');
    const decoded = JSON.parse(json) as {
      realm_access?: { roles?: unknown };
    };
    const roles = decoded.realm_access?.roles;
    return Array.isArray(roles) ? roles.filter((r): r is string => typeof r === 'string') : [];
  } catch {
    return [];
  }
}

/** Tipo mínimo del token que renovamos (JWT de NextAuth). */
type RefreshableToken = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  roles?: string[];
  error?: string;
};

/**
 * Renueva el access_token usando el refresh_token contra Keycloak.
 * Si falla (refresh expirado/ inválido), marca el token con error para que la
 * UI fuerce un nuevo login.
 */
async function refreshAccessToken(
  token: RefreshableToken,
): Promise<RefreshableToken> {
  const issuer = process.env.KEYCLOAK_ISSUER;
  if (!issuer || !token.refreshToken) {
    return { ...token, error: 'RefreshAccessTokenError' };
  }
  try {
    const response = await fetch(`${issuer}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.KEYCLOAK_CLIENT_ID ?? '',
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET ?? '',
        refresh_token: token.refreshToken,
      }),
    });
    const data = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
    };
    if (!response.ok || !data.access_token) {
      throw new Error(data.error ?? 'refresh_failed');
    }
    return {
      ...token,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? token.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 300),
      roles: extractRealmRoles(data.access_token),
      error: undefined,
    };
  } catch {
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}

export const authOptions: AuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID ?? '',
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET ?? '',
      issuer: process.env.KEYCLOAK_ISSUER ?? '',
    }),
  ],

  callbacks: {
    async jwt({ token, account }) {
      // 1) Primer login: account trae los tokens de Keycloak.
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.roles = extractRealmRoles(account.access_token);
        return token;
      }

      // 2) Si el access_token sigue vigente (margen de 30s), se reutiliza.
      const expiresAtMs = (token.expiresAt ?? 0) * 1000;
      if (Date.now() < expiresAtMs - 30_000) {
        return token;
      }

      // 3) Expirado (o casi): renovar con el refresh_token.
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      // Exponer el access_token, roles y error de refresco al cliente.
      session.accessToken = token.accessToken;
      session.roles = token.roles ?? [];
      session.error = token.error;
      return session;
    },
  },

  events: {
    /**
     * Federated logout: además de borrar la cookie de NextAuth, revoca la
     * sesión SSO en Keycloak usando el refresh_token. Sin esto, Keycloak
     * mantiene la sesión y el siguiente login no pediría credenciales.
     */
    async signOut({ token }) {
      const issuer = process.env.KEYCLOAK_ISSUER;
      const refreshToken = token.refreshToken;
      if (!issuer || !refreshToken) return;

      try {
        await fetch(`${issuer}/protocol/openid-connect/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.KEYCLOAK_CLIENT_ID ?? '',
            client_secret: process.env.KEYCLOAK_CLIENT_SECRET ?? '',
            refresh_token: refreshToken,
          }).toString(),
        });
      } catch {
        // Best-effort: si Keycloak no responde, la cookie local igual se borró.
      }
    },
  },

  pages: {
    // La landing pública (/) actúa como pantalla de login (botón → Keycloak).
    signIn: '/',
  },

  session: {
    strategy: 'jwt',
  },

  secret: process.env.NEXTAUTH_SECRET,
};
