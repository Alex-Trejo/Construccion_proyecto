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
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
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
      // En el primer login, account contiene los tokens de Keycloak
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },

    async session({ session, token }) {
      // Exponer el access_token al cliente via la sesión
      session.accessToken = token.accessToken;
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
