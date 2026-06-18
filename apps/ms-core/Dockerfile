# syntax=docker/dockerfile:1
###############################################################################
# ms-core — Microservicio de Negocio (NestJS)
# Build multi-stage en monorepo pnpm. Contexto de build: raíz del repo.
###############################################################################

# ── Builder ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
WORKDIR /repo

# Copiamos todo el monorepo (node_modules/dist excluidos por .dockerignore)
COPY . .

RUN pnpm install --frozen-lockfile
# Turbo compila @sgc/shared (dependsOn ^build) y luego ms-core
RUN pnpm exec turbo run build --filter=@sgc/ms-core

# ── Runner ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
ENV NODE_ENV=production
WORKDIR /repo

# Copiamos el monorepo ya instalado y compilado (mantiene symlinks de pnpm)
COPY --from=builder /repo ./

WORKDIR /repo/apps/ms-core
# TCP 3001 (inter-servicio) + HTTP 3010 (health). Las vars de entorno
# (POSTGRES_*, MINIO_*, etc.) se inyectan en runtime.
EXPOSE 3001 3010
CMD ["node", "dist/main.js"]
