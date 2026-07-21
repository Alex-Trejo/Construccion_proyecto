# SGC — Sistema de Gestión de Comprobantes

Monorepo (Turborepo + pnpm) para la gestión automatizada de comprobantes electrónicos del SRI (Ecuador).
Arquitectura de microservicios, Clean Architecture, TypeScript estricto y configuración **Fail-Fast**
(si falta una variable de entorno, la app crashea al arrancar — no hay valores por defecto).

| App | Descripción | Puerto |
|-----|-------------|--------|
| `apps/frontend` | Next.js 16 (App Router) + NextAuth/Keycloak. UI Neo-Brutalist. | **3005** |
| `apps/api-gateway` | NestJS. Puerta de entrada HTTP, valida JWT y enruta por TCP. | **3000** (prefijo `/api/v1`) |
| `apps/ms-core` | NestJS. Lógica de negocio (Clean Arch), persistencia, OCR, reportes, pipeline SRI. | TCP **3001** / HTTP **3010** |
| `apps/ms-sync` | NestJS. Worker IMAP multiusuario que descarga comprobantes del correo. | TCP **3002** |
| `packages/shared` | `@sgc/shared`: DTOs, interfaces, enums y patrones TCP. | — |

> **Multi-tenant:** todas las consultas están **aisladas por dueño** (`owner_id` = `sub` del JWT).
> Cada usuario solo ve sus proveedores, documentos y correos.

---

## 1. Prerrequisitos

- **Node.js** ≥ 20 (probado con 22)
- **pnpm** ≥ 9 (`npm i -g pnpm`)
- **Docker Desktop** (con Docker Compose v2)

---

## 2. Paso a paso (local)

> Ejecuta todo desde la raíz del proyecto.

### 2.1. Instalar dependencias
```bash
pnpm install
```

### 2.2. Variables de entorno
Ya existen archivos de desarrollo listos para usar (ambos en `.gitignore`):
- **`.env`** (raíz) — usado por Docker Compose y los microservicios backend.
- **`apps/frontend/.env.local`** — usado por el frontend (NextAuth + Keycloak).

> Si no existieran, créalos copiando `.env.example`. Los valores por defecto ya funcionan en local.

**Variables nuevas (Fases C/D) que deben estar en `.env`:**
```env
OPENAI_API_KEY=sk-...            # OCR real (OpenAI Vision) para comprobantes físicos
OPENAI_OCR_MODEL=gpt-4o-mini
ENCRYPTION_KEY=<64 hex>          # 32 bytes hex — cifra contraseñas IMAP (AES-256-GCM)
```
> `ENCRYPTION_KEY` debe ser **idéntica** en `ms-core` y `ms-sync` (uno cifra, el otro descifra).
> Genérala con: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 2.3. Levantar la infraestructura (Docker)
```bash
docker compose up -d
docker compose ps         # verificar que estén healthy
```
Arranca: **PostgreSQL, Keycloak, MinIO, Prometheus, Loki y Grafana**.
Keycloak **importa automáticamente** el realm `sgc-realm` (clientes y usuarios) desde
`infrastructure/keycloak/realm-sgc-export.json`.

> **Si cambias el realm:** Keycloak (dev mode) solo importa al crear el contenedor.
> Re-importar: `docker compose up -d --force-recreate keycloak`.
>
> **Windows:** usa `127.0.0.1` (no `localhost`) para Postgres/MinIO en `.env` — Windows resuelve
> `localhost` a IPv6 y cuelga las conexiones de Node a puertos publicados por Docker.

### 2.4. Compilar
```bash
pnpm build               # compila @sgc/shared primero, luego cada app → debe dar 5/5 verde
```

### 2.5. Ejecutar las apps (modo desarrollo)
```bash
pnpm dev                 # ms-core, ms-sync, api-gateway y frontend en paralelo (hot-reload)
```

<details>
<summary>O ejecutar cada servicio por separado (4 terminales)</summary>

```bash
pnpm --filter @sgc/ms-core dev
pnpm --filter @sgc/ms-sync dev
pnpm --filter @sgc/api-gateway dev
pnpm --filter frontend dev
```
Orden recomendado: `ms-core` y `ms-sync` antes que `api-gateway`.
</details>

### 2.6. Abrir la app
- **Frontend** → http://localhost:3005 → **Login** → Keycloak → dashboard.
- **Swagger UI** → http://localhost:3000/docs (probar la API con Bearer token).

---

## 3. Accesos y credenciales (desarrollo)

### 🔐 Login de la aplicación (Keycloak realm `sgc-realm`)
| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin-sgc` | `Admin123!` | Administrador |
| `contador-sgc` | `Contador123!` | Contador |

Roles del realm: **Administrador**, **Contador**, **Asistente**.

### 🖥️ Consolas y servicios
| Servicio | URL | Usuario | Contraseña |
|----------|-----|---------|-----------|
| **Frontend (app)** | http://localhost:3005 | *(login Keycloak ↑)* | |
| **Swagger / OpenAPI** | http://localhost:3000/docs | *(pega Bearer JWT)* | |
| **API Gateway** | http://localhost:3000/api/v1 | *(Bearer JWT)* | |
| **Keycloak (admin)** | http://localhost:8080 | `admin` | `admin` |
| **MinIO (consola)** | http://localhost:9001 | `minioadmin` | `minioadmin` |
| **Grafana** | http://localhost:3050 | `admin` | `admin` |
| **Prometheus** | http://localhost:9090 | — | — |
| **Loki (API)** | http://localhost:3100 | — | — |
| **PostgreSQL** | localhost:5432 | `sgc_user` | `sgc_password` (db: `sgc_db`) |

> Credenciales **de desarrollo local**. Cámbialas para cualquier entorno real.

### Obtener un access_token (probar la API sin navegador)
```bash
curl -s -X POST http://localhost:8080/realms/sgc-realm/protocol/openid-connect/token \
  -d grant_type=password -d client_id=sgc-frontend -d client_secret=local-dev-secret \
  -d username=admin-sgc -d password='Admin123!' -d scope=openid | jq -r .access_token
```
Pega el token en Swagger (**Authorize → Bearer**) o úsalo como `Authorization: Bearer <token>`.

---

## 4. Rutas de la API  (`base = http://localhost:3000/api/v1`)

Todas requieren `Authorization: Bearer <token>` salvo el health check.
La columna **Rol** = restricción de `@Roles` (sin marca → cualquier usuario autenticado).
Resultados **aislados por dueño** (cada usuario ve solo lo suyo).

### Health
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/` | público | Health check del gateway |

### IAM — Usuarios y Roles (Keycloak Admin)
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/users` | Administrador | Lista usuarios |
| POST | `/users` | Administrador | Crea usuario (password en Keycloak, NO en Postgres) |
| PUT | `/users/:id/roles` | Administrador | Asigna roles a un usuario |
| GET | `/roles` | Administrador | Lista roles del realm |
| POST | `/roles` | Administrador | Crea un rol |
| DELETE | `/roles/:name` | Administrador | Elimina un rol |

### Proveedores
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/suppliers` | Administrador, Contador | Crea proveedor (código auto-generado por Factory) |
| GET | `/suppliers` | autenticado | Lista proveedores del usuario |
| GET | `/suppliers/:id` | autenticado | Detalle |
| PUT | `/suppliers/:id` | Administrador, Contador | Actualiza |
| DELETE | `/suppliers/:id` | Administrador, Contador | Desactiva |

### Documentos / Comprobantes
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/documents/physical` | Administrador, Contador | Sube imagen (multipart) → MinIO → **OCR OpenAI** |
| POST | `/documents/bulk-txt` | Administrador, Contador | Carga masiva desde TXT |
| POST | `/documents` | Administrador, Contador | Crea documento (único por `owner+ruc+numeroFactura`) |
| GET | `/documents` | autenticado | Listado paginado (`?page=&limit=`) |
| GET | `/documents/export` | autenticado | **Exporta .xlsx** (exceljs) |
| GET | `/documents/:id` | autenticado | Detalle (con ítems e impuestos) |
| GET | `/documents/:id/preview` | autenticado | **Pre-Signed URL** de MinIO |

### Reportes / Dashboard
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/dashboard/metrics` | autenticado | KPIs (total gastado, nº comprobantes, por estado, por mes) |

### Comunicaciones (correos recibidos por IMAP)
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/communications?page=1&limit=10` | autenticado | Correos del usuario, paginados |
| GET | `/communications/:id` | autenticado | Detalle del correo |
| GET | `/communications/:id/attachments/:aid/download` | autenticado | Pre-Signed URL del adjunto |

### Configuración IMAP del usuario
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/user/imap-config` | autenticado | Guarda credenciales IMAP (**password cifrado AES-256-GCM** en Postgres) |

> **Flujo IMAP multiusuario:** cada usuario registra su buzón con `POST /user/imap-config`.
> El worker `ms-sync` consulta periódicamente a `ms-core` las configuraciones activas, descifra
> las contraseñas **en memoria**, escanea el INBOX de **cada** usuario por separado e inyecta el
> `userId` en el evento `DOCUMENT_RECEIVED` (aislamiento extremo a extremo).

---

## 5. Observabilidad (stack PLG)

**Prometheus + Loki + Grafana.** Las apps corren en el host (`pnpm dev`) y Prometheus las
scrapea vía `host.docker.internal`.

### Métricas (Prometheus)
- `api-gateway` → http://localhost:3000/api/v1/metrics
- `ms-core` → http://localhost:3010/metrics
- Prometheus UI → http://localhost:9090 — **Status → Targets** para ver UP/DOWN.

### Logs (Loki)
- Las 3 apps envían logs con `winston-loki` (label `app=<nombre>`), host `LOKI_URL` (`http://127.0.0.1:3100`).
- `ms-sync` solo emite logs (no expone HTTP).

### Grafana — paso a paso
1. Abre http://localhost:3050 (login `admin` / `admin`).
2. **Dashboards → SGC — Overview** (provisionado desde `infrastructure/grafana/provisioning/`).
3. **Explore**:
   - Datasource **Prometheus** → p. ej. `up` o métricas `http_*` de las apps.
   - Datasource **Loki** → `{app="ms-core"}`, `{app="api-gateway"}`, `{app="ms-sync"}`.
4. Para ver el flujo IMAP en vivo: filtra `{app="ms-sync"}` mientras corre el cron.

> Si Loki está caído verás `ECONNREFUSED 127.0.0.1:3100` en consola — es ruido del transporte de
> logs, no afecta el funcionamiento de las apps.

---

## 6. Comandos útiles

| Acción | Comando |
|--------|---------|
| Compilar todo | `pnpm build` |
| Desarrollo (todo) | `pnpm dev` |
| Lint | `pnpm lint` |
| Tests (si existen) | `pnpm test` |
| Estado de la infra | `docker compose ps` |
| Apagar infra | `docker compose down` |
| Apagar + borrar datos | `docker compose down -v` |
| Logs de un servicio | `docker compose logs -f keycloak` |

---

## 7. Arquitectura y convenciones

- **Clean Architecture**: `domain` (entidades/puertos/VOs) → `application` (use-cases) →
  `infrastructure` (adaptadores TypeORM/externos) → `presentation` (controllers TCP).
- **TCP entre servicios**: el gateway usa `ClientProxy.send()` (request/response → `@MessagePattern`)
  y `emit()` (eventos → `@EventPattern`). Todo `send/emit` lleva `metadata.userId` (del JWT) para el
  aislamiento multi-tenant.
- **Seguridad**: `JwtAuthGuard` (Passport-JWT contra Keycloak) + `RolesGuard` (`@Roles(...)`).
- **Fail-Fast**: validación de entorno con Joi, sin `.default()`.
- **TypeScript estricto**: prohibido `any`.

---

## 8. Notas

- **CI/CD (hecho):** workflows en `.github/workflows/` — `ci.yml` (build/lint/test + SonarCloud +
  Trivy + alerta Telegram) y `cd.yml` (build + push de imágenes a GHCR + Telegram).
- **Tailwind v4:** la paleta + utilidades `.brutal-*` se definen con `@theme` en
  `apps/frontend/src/app/globals.css` (en v4 reemplaza a `tailwind.config.ts`).
- **Pipeline SRI:** la validación XSD usa los esquemas en `infrastructure/xsd/`.
- **Puertos:** el frontend usa **3005** para no chocar con el gateway (**3000**).
- **Pendiente:** Fase 7 (Terraform). Rotar `OPENAI_API_KEY` antes de cualquier entorno real.
</content>
