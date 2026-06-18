# syntax=docker/dockerfile:1
###############################################################################
# api-gateway — Puerta de entrada HTTP (NestJS). Build multi-stage monorepo pnpm.
# Contexto de build: raíz del repo.
###############################################################################

FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=@sgc/api-gateway

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=builder /repo ./
WORKDIR /repo/apps/api-gateway
# HTTP 3000 (prefijo /api/v1).
EXPOSE 3000
CMD ["node", "dist/main.js"]
