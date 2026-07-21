# syntax=docker/dockerfile:1
###############################################################################
# frontend — Next.js 16. Build multi-stage en monorepo pnpm.
# Contexto de build: raíz del repo.
#
# Nota: el build de Next ejecuta el Fail-Fast (serverEnv) al recolectar páginas,
# por eso se definen placeholders de build para las vars de SERVIDOR (runtime).
#
# NEXT_PUBLIC_API_GATEWAY_URL se deja SIN definir a propósito: el frontend usa
# entonces la ruta RELATIVA `/api/v1` (ver api-client.ts), que en producción
# sirve Caddy en el mismo dominio. En dev NO se usa esta imagen (se corre
# `pnpm dev` con `.env.local`).
###############################################################################

FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile

# Placeholders SOLO para que el build pase el Fail-Fast (vars de servidor).
ENV NEXTAUTH_URL="http://localhost:3005" \
    NEXTAUTH_SECRET="build-time-placeholder" \
    KEYCLOAK_CLIENT_ID="sgc-frontend" \
    KEYCLOAK_CLIENT_SECRET="build-time-placeholder" \
    KEYCLOAK_ISSUER="http://localhost:8080/realms/sgc-realm"
RUN pnpm exec turbo run build --filter=frontend

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
ENV NODE_ENV=production
ENV PORT=3005
WORKDIR /repo
COPY --from=builder /repo ./
WORKDIR /repo/apps/frontend
EXPOSE 3005
CMD ["pnpm", "start"]
