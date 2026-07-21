---
name: sgc-monorepo-state
description: Estado y arquitectura del monorepo SGC (Sistema de Gestión de Comprobantes)
metadata: 
  node_type: memory
  type: project
  originSessionId: 7deaa614-274b-4a68-bc79-f8e203472e31
---

Monorepo Turborepo+pnpm en `c:\Users\trejo\Desktop\S9\construccion\Parcial II\Proyecto`. Namespace `@sgc/*`. Stack: TypeScript estricto (prohibido `any`), Clean Architecture, Fail-Fast con Joi (cero `.default()`), TCP entre microservicios.

Paquetes: `frontend` (Next.js **16** — convención `proxy` reemplaza `middleware`, ver `apps/frontend/AGENTS.md`), `api-gateway` (NestJS + Auth JWT/Keycloak), `ms-core` (microservicio de negocio NestJS, híbrido HTTP+TCP), `ms-sync` (worker IMAP), `packages/shared` (`@sgc/shared`, tipos/DTOs/enums/patterns TCP).

Estado tras la sesión del 2026-06-18 (continuación del trabajo de Antigravity, ver [[antigravity-context-location]]):
- **Baseline saneado:** `pnpm build` 5/5 verde; docker compose 6/6 healthy (Postgres, Keycloak, MinIO, Prometheus, Loki, Grafana).
- Se reconstruyó el scaffolding de `ms-core` (faltaban `package.json`/`tsconfig`/`nest-cli`).
- Se cerraron los mocks: `TypeOrmSupplierRepository`, `TypeOrmIncomingInvoiceRepository`, `XmlSriParserAdapter` (fast-xml-parser), módulo Supplier completo, AuthModule JWT del gateway. `ms-core` arranca y conecta a Postgres/MinIO sin errores DI.
- Se quitó `incremental:true` de `tsconfig.base.json` (rompía la emisión de `dist` con `deleteOutDir` de Nest).
- Resueltos: `XSD_SCHEMAS_PATH` (resolución robusta contra la raíz del monorepo en `fetch-and-sanitize-xml.use-case.ts`) y `CompanyRepositoryPort` (port + `TypeOrmCompanyRepository` + auto-creación de Company en `auto-provision-entities.use-case.ts`).
- **Fase 6 (frontend) COMPLETA:** Next.js 16 + Tailwind v4 (`@theme` en `globals.css`, NO hay `tailwind.config.ts` — es lo idiomático en v4), diseño Neo-Brutalist (utilidades `.brutal-*`). Auth NextAuth+Keycloak (`auth-options.ts`, callbacks guardan `accessToken`), `useApi` inyecta Bearer, `proxy.ts` protege `/dashboard`. Páginas: landing `/`, `/dashboard`, `/dashboard/suppliers` (form con selector tipo → Factory Method), `/dashboard/communications` (tabla paginada + descarga vía Pre-Signed URL con `window.open`). Frontend corre en **:3005** (gateway en :3000). Se añadió `SupplierController` (POST/GET /suppliers) al gateway como proxy TCP a ms-core.

**Puertos:** gateway 3000 (prefijo `/api/v1`), ms-core TCP 3001 / HTTP 3010, ms-sync TCP 3002, frontend 3005. `apps/frontend/.env.local` tiene las vars (NEXT_PUBLIC_API_GATEWAY_URL, NEXTAUTH_*, KEYCLOAK_*).

**Fase 8 (CI/CD) hecha:** repo GitHub `https://github.com/Alex-Trejo/Construccion_proyecto.git`, ramas `main`/`develop`/`qa` (pusheadas). Workflows en `.github/workflows/`: `ci.yml` (build/lint/test + SonarQube como service container no-bloqueante + Trivy + alerta Telegram) y `cd.yml` (build + push de 4 imágenes Docker a GHCR `ghcr.io/alex-trejo/sgc-*` + Telegram). Dockerfiles multi-stage por app (contexto = raíz, full monorepo copy). Telegram: bot @Trazabilidad_SGC_bot, chat_id privado **1621388169** (va como secret `TELEGRAM_CHAT_ID`; el token como `TELEGRAM_BOT_TOKEN`). GHCR usa `GITHUB_TOKEN` (requiere Workflow permissions = read/write). Docker builds NO probados localmente (el del frontend es el más delicado por Next 16 + Fail-Fast). Identidad git: Alex Trejo / lanchado10@gmail.com.

**Observabilidad (PLG) integrada:** `/metrics` en api-gateway (`/api/v1/metrics`) y ms-core (`/metrics`, puerto 3010) con `@willsoto/nestjs-prometheus`. Las 3 apps envían logs a Loki vía `winston-loki` (logger en `src/observability/loki-logger.ts`, label `app=<nombre>`, host `LOKI_URL` default `http://127.0.0.1:3100`). Prometheus scrapea las apps en `host.docker.internal:3000/3010` (corren en host con pnpm dev). Grafana: datasources con uid `prometheus`/`loki` + dashboard provisionado `SGC — Overview` (`infrastructure/grafana/provisioning/dashboards/`). Verificado: target ms-core UP + logs en Loki. ms-sync solo logs (no tiene HTTP).

**Recordatorio entorno:** usar `127.0.0.1` (no `localhost`) para Postgres/MinIO en `.env` — Windows resuelve `localhost` a IPv6 y cuelga las conexiones de Node a puertos de Docker.

**Backend ERS (Fases A–D) COMPLETO en rama `develop`** (repo Alex-Trejo/Construccion_proyecto):
- A: RBAC (`@Roles`+`RolesGuard` validan roles del JWT, dinámicos), `UserController`/`RoleController` vía Keycloak Admin REST API (escribe en KC → espeja en Postgres), `@CurrentUser` + `buildTcpMetadata` (userId del JWT en cada llamada TCP).
- Swagger en `/docs` (Bearer).
- B: Supplier CRUD completo (GET/:id, PUT, DELETE) con aislamiento `owner_id`.
- C: Comprobantes (`documents`+`document_items`+`document_taxes`) + OCR real OpenAI Vision (`OpenAiOcrAdapter`, `@willsoto`... no: SDK `openai`). Endpoints: POST /documents/physical (multipart→OCR), /bulk-txt, POST /documents (unicidad owner+ruc+numero), GET /documents(+/:id, /:id/preview presigned).
- D: Reportes (GET /dashboard/metrics agregaciones SQL; GET /documents/export XLSX con exceljs) + IMAP multiusuario: POST /user/imap-config (password cifrado AES-256-GCM con ENCRYPTION_KEY), `ms-sync` cron refactorizado consulta configs activas a ms-core, descifra en memoria y escanea cada buzón inyectando userId en DOCUMENT_RECEIVED.
- Aislamiento (multi-tenancy) por `owner_id` en suppliers, documents y received_emails (filtrado + dedup por dueño).
- Env nuevos en `.env`: OPENAI_API_KEY, OPENAI_OCR_MODEL, ENCRYPTION_KEY (64 hex). ms-sync IMAP_* ahora opcional (las credenciales vienen cifradas de la BD por usuario).

**Flujo Comprobantes TXT→SRI→documents + validación (sesión 2026-07-16, rama develop):**
- Carga TXT (`ProcessTxtBatchUseCase`) **solo stagea** las claves en `incoming_invoices` (ahora con `owner_id`), estado PENDIENTE. NO crea `documents` por sí sola.
- `ImportSriDocumentsUseCase` (fire-and-forget disparado tras el TXT en `document-tcp.controller.bulkTxt`) consulta el **SRI SOAP** (`SriSoapApiAdapter.fetchAuthorization`; se corrigió el envelope a `autorizacionComprobante`/`claveAccesoComprobante`), sanitiza/valida XSD, parsea (`XmlSriParserAdapter` ahora expone `serialNumber`=estab-ptoEmi-secuencial) y **crea el `documents` completo** (ítems+impuestos) aislado por owner, guardando el `xml_content` limpio. Claves rechazadas → `incoming_invoices.estado=ERROR` con mensaje.
- **Máquina de estados `DocumentStatus`**: `document-status.rules.ts` + `DocumentValidationService` (totales: subtotal+iva≈total, Σítems≈subtotal). `ValidateDocumentUseCase` (PENDIENTE→EN_VALIDACION→VALIDADO/INCONSISTENTE con `observaciones`), `ValidatePendingDocumentsUseCase`, `AdvanceDocumentStatusUseCase` (VALIDADO→CONSOLIDADO). Enganchada automática en create e import.
- Patterns nuevos `DOCUMENT_PATTERNS.VALIDATE_PENDING/SET_STATUS/LIST_IMPORT_ERRORS`. Gateway: `POST /documents/validate-pending`, `POST /documents/:id/consolidate|revalidate`, `GET /documents/import-errors`. Columnas nuevas en `documents`: `observaciones`, `xml_content`.
- Frontend: botón "Validar pendientes" + panel "Errores de importación"; detalle con sección "XML del SRI" (copiar), alerta `observaciones` y botones Consolidar/Revalidar; polling tras TXT (SRI en 2º plano). `useApi` con put/delete/upload/download; roles Keycloak en sesión (`useRoles`, gating admin).
- **Nota SRI:** requiere internet + clave AUTORIZADA en producción. 1ª prueba real (RUC 1002142659): 27 creados, 11 ERROR ("No se encontró <autorizacion>").

**Pendientes:** Fase 7 (Terraform). Verificación e2e en runtime de C/D vía Swagger. Rotar OPENAI_API_KEY (se expuso en chat). Setup del usuario en CI/CD: revocar/rotar token Telegram, añadir secrets, fijar Workflow permissions a read/write. Para login real falta configurar en Keycloak el client `sgc-frontend` (redirect URI `http://localhost:3005/api/auth/callback/keycloak`). `.env` y `.env.local` existen (gitignored).
