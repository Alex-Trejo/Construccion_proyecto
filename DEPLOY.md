# Despliegue en producción — SGC / FacturLink

Guía para levantar el sistema en un entorno real con **TLS**, CORS restringido y
secretos rotados.

## Arquitectura de despliegue

```
                        ┌──────── https://auth.<dominio>  → keycloak:8080 (SSO)
Internet ─(443/TLS)─▶ Caddy ┼──── https://grafana.<dominio> → grafana:3000 (login propio)
                        └──────── https://<dominio>
                                    ├─ /api/v1/* ─▶ api-gateway:3000 ─TCP─▶ ms-core / ms-sync
                                    └─ resto       ─▶ frontend:3005 (Next.js + NextAuth)

   Red interna (NO expuesta): Postgres · Keycloak(H2) · MinIO · Prometheus · Loki
   Archivos (RIDE PDF / adjuntos): navegador ─▶ gateway (JWT) ─▶ MinIO interno ─stream─▶ navegador
```

Caddy termina HTTPS (Let's Encrypt automático) para los 3 subdominios y enruta el
tráfico. **MinIO nunca se expone**: los archivos se sirven por un proxy autenticado
del gateway (`/documents/:id/file`, `/communications/:id/attachments/:aid/file`).

## Requisitos

- Un servidor con Docker + Docker Compose v2.
- Un **dominio público** apuntando al servidor (registro A/AAAA).
- Puertos **80** y **443** abiertos.

## Pasos

```bash
# 1. Variables de entorno de producción
cp .env.production.example .env
#    Editar .env: APP_DOMAIN/AUTH_DOMAIN/GRAFANA_DOMAIN, GHCR_OWNER, CORS_ORIGIN,
#    URLs https y SECRETOS nuevos.

# 2a. Primer arranque manual (construye localmente con el fallback `build:`):
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
# 2b. En adelante lo hace el CD solo (pull de GHCR); manual sería:
#     docker compose -f docker-compose.yml -f docker-compose.prod.yml pull && ... up -d

# 3. Verificar
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
#    Abrir https://<APP_DOMAIN> → landing → login Keycloak → dashboard.
```

> **Prueba local sin dominio:** usa `APP_DOMAIN=localhost` (y `auth.localhost` /
> `grafana.localhost`); Caddy emite un certificado interno (el navegador avisará).
> Con un dominio real, Caddy provisiona el certificado automáticamente.

## Configuración de Keycloak (una vez)

Con el despliegue de 3 subdominios (ver `infrastructure/terraform/README.md`):
- Keycloak vive en `https://<AUTH_DOMAIN>` (el overlay de prod ya le pasa
  `--hostname=<AUTH_DOMAIN> --proxy=edge`).
- Client `sgc-frontend` (confidential): **Valid Redirect URIs**
  `https://<APP_DOMAIN>/api/auth/callback/keycloak` y **Web Origins** `https://<APP_DOMAIN>`.
- El realm `sgc-realm` se importa solo (`--import-realm`) desde
  `infrastructure/keycloak/realm-sgc-export.json`; **cambia las contraseñas** de los
  usuarios semilla tras el primer arranque.
- Para una prod estricta, migra Keycloak a `start` + Postgres externo (hoy usa H2).

## ✅ Checklist de secretos a ROTAR (obligatorio antes de exponer)

| Secreto | Dónde | Nota |
|---|---|---|
| `OPENAI_API_KEY` | `.env` | **Se expuso en desarrollo — rotar sí o sí.** |
| `ENCRYPTION_KEY` | `.env` (ms-core y ms-sync, **idéntica**) | Al rotarla, los usuarios deben **re-guardar** su config IMAP (las contraseñas cifradas dejan de descifrarse). |
| `KEYCLOAK_CLIENT_SECRET` | `.env` + Keycloak | Reemplazar el `local-dev-secret`. |
| `KEYCLOAK_ADMIN_PASSWORD` | `.env` | Admin de Keycloak. |
| `NEXTAUTH_SECRET` | `.env` | `openssl rand -base64 32`. |
| `POSTGRES_PASSWORD` | `.env` | Contraseña fuerte. |
| `MINIO_ROOT_USER/PASSWORD` | `.env` | Credenciales fuertes (≥ 8). |
| `TELEGRAM_BOT_TOKEN` | Secrets de GitHub Actions | Rotar si se compartió. |

## Notas de seguridad ya aplicadas en el código

- **JWT**: validación RS256 contra el JWKS de Keycloak + issuer (firmas verificadas).
- **RBAC**: permisos por rol validados en cada request (Asistente opera; Contador
  lee/exporta/consolida; Administrador todo). Único endpoint público: `/` (health).
- **MinIO privado**: no se exponen URLs pre-firmadas al navegador; el gateway hace de
  **proxy autenticado** y aislado por dueño. `MINIO_ENDPOINT` queda interno (`sgc-minio`).
- **Rate limiting** (`@nestjs/throttler`): 100 req/min por IP global; **8/min** en OCR
  (coste OpenAI) y **4/min** en carga TXT. `trust proxy` para leer la IP real tras Caddy.
- **Límites de subida**: 8 MB (foto OCR) / 5 MB (TXT) → anti-DoS.
- **Swagger** deshabilitado si `NODE_ENV=production`; **`/api/v1/metrics`** bloqueado por
  Caddy (403) — Prometheus lo scrapea por la red interna.
- **CORS**: el gateway lee `CORS_ORIGIN`. Si falta en producción, warning + permite todo
  — **fíjalo siempre**. (Con la API relativa `/api/v1`, en el mismo dominio ni se necesita.)
- **Fail-Fast**: sin `.env` completo, las apps no arrancan (error Joi descriptivo).
- **Imagen del frontend agnóstica**: usa la ruta relativa `/api/v1` (no hay dominio
  horneado en build), así la misma imagen sirve para cualquier despliegue.

## CI/CD completo (GitHub Actions → GHCR → EC2)

Con `.github/workflows/cd.yml`, cada **push a `main`** hace:
1. **Build & push** de las 4 imágenes a **GHCR** (`ghcr.io/<owner>/sgc-*`).
2. **Deploy** (solo si el build pasó): SSH a la EC2 → `docker login ghcr` →
   `docker compose pull` → `docker compose up -d` (la instancia toma la nueva versión).
3. Notificación a Telegram (desplegado / falló).

> Un push a `qa` solo publica imágenes (no despliega). Para exigir lint/tests antes,
> protege `main` (branch protection) requiriendo que el workflow **CI** pase antes de mergear.

### Secrets a configurar en el repo (Settings → Secrets and variables → Actions)

| Secret | Valor |
|---|---|
| `DEPLOY_HOST` | La **Elastic IP** de la EC2 (output de Terraform). |
| `DEPLOY_USER` | `ubuntu`. |
| `DEPLOY_SSH_KEY` | La **clave privada** SSH cuya pública cargaste en Terraform. |
| `GHCR_USER` | Tu usuario de GitHub. |
| `GHCR_TOKEN` | Un **PAT** (classic) con permiso `read:packages` (para que la EC2 baje imágenes privadas). |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | (Ya existentes) notificaciones. |

### Preparación única de la instancia
- La instancia ya tiene Docker y el repo en `/opt/facturlink` (por el `user_data` de Terraform).
- Crea el `.env` en `/opt/facturlink` (`cp .env.production.example .env` + completar) **una vez**.
- El primer `up` puede hacerse manual; a partir de ahí, cada push a `main` actualiza solo.
- Las imágenes son **privadas** en GHCR → el `docker login` del job las autoriza; si prefieres,
  puedes hacerlas públicas y omitir `GHCR_USER`/`GHCR_TOKEN`.

## Pendientes de infraestructura (no cubiertos aquí)

- Alta disponibilidad / réplicas (RNF05 99.9%).
- Backups de Postgres y MinIO.
- IaC (Terraform) para AWS/GCP.
