# syntax=docker/dockerfile:1
###############################################################################
# ms-sync — Worker IMAP (NestJS). Build multi-stage en monorepo pnpm.
# Contexto de build: raíz del repo.
###############################################################################

FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=@sgc/ms-sync

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=builder /repo ./
WORKDIR /repo/apps/ms-sync
# ms-sync no expone puertos (es cliente TCP + cron IMAP).
CMD ["node", "dist/main.js"]
