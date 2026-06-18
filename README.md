# SGC — Sistema de Gestión de Comprobantes

Monorepo (Turborepo + pnpm) para la gestión automatizada de comprobantes electrónicos del SRI (Ecuador).

| App | Descripción | Puerto |
|-----|-------------|--------|
| `apps/frontend` | Next.js 16 (App Router) + NextAuth/Keycloak. UI Neo-Brutalist. | **3005** |
| `apps/api-gateway` | NestJS. Puerta de entrada HTTP, valida JWT y enruta por TCP. | **3000** (prefijo `/api/v1`) |
| `apps/ms-core` | NestJS. Lógica de negocio (Clean Arch), persistencia, pipeline SRI. | TCP **3001** / HTTP **3010** |
| `apps/ms-sync` | NestJS. Worker IMAP que descarga comprobantes del correo. | TCP **3002** |
| `packages/shared` | `@sgc/shared`: DTOs, interfaces, enums y patrones TCP. | — |

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

### 2.3. Levantar la infraestructura (Docker)
```bash
docker compose up -d
```
Esto arranca: PostgreSQL, Keycloak, MinIO, Prometheus, Loki y Grafana.
Verifica que estén `healthy`:
```bash
docker compose ps
```
Keycloak **importa automáticamente** el realm `sgc-realm` (clientes y usuarios) desde
`infrastructure/keycloak/realm-sgc-export.json`.

> **Si cambias el realm:** Keycloak (en dev mode) solo importa al crear el contenedor.
> Para re-importar: `docker compose up -d --force-recreate keycloak`.

### 2.4. Compilar
```bash
pnpm build
```
(Compila `@sgc/shared` primero y luego cada app.)

### 2.5. Ejecutar las apps (modo desarrollo)
La forma más simple — todo en paralelo con Turborepo:
```bash
pnpm dev
```
Esto levanta `ms-core`, `ms-sync`, `api-gateway` y `frontend` a la vez (con hot-reload).

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
👉 **http://localhost:3005** → clic en **Login** → te redirige a Keycloak → inicia sesión → dashboard.

---

## 3. Accesos y credenciales (desarrollo)

### 🔐 Login de la aplicación (Keycloak realm `sgc-realm`)
| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin-sgc` | `Admin123!` | Administrador |
| `contador-sgc` | `Contador123!` | Contador |

### 🖥️ Consolas y servicios
| Servicio | URL | Usuario | Contraseña |
|----------|-----|---------|-----------|
| **Frontend (app)** | http://localhost:3005 | *(login Keycloak ↑)* | |
| **API Gateway** | http://localhost:3000/api/v1 | *(Bearer JWT)* | |
| **Keycloak (admin)** | http://localhost:8080 | `admin` | `admin` |
| **MinIO (consola)** | http://localhost:9001 | `minioadmin` | `minioadmin` |
| **Grafana** | http://localhost:3050 | `admin` | `admin` |
| **Prometheus** | http://localhost:9090 | — | — |
| **Loki (API)** | http://localhost:3100 | — | — |
| **PostgreSQL** | localhost:5432 | `sgc_user` | `sgc_password` (db: `sgc_db`) |

> Estas son credenciales **de desarrollo local**. Cámbialas para cualquier entorno real.

---

## 4. Endpoints principales del API Gateway

> Todos requieren header `Authorization: Bearer <access_token>` (el frontend lo inyecta automáticamente).

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/v1/suppliers` | Crea proveedor (PERSONA_NATURAL \| PERSONA_JURIDICA) → Factory Method |
| `GET` | `/api/v1/suppliers` | Lista proveedores |
| `GET` | `/api/v1/communications?page=1&limit=10` | Correos recibidos (paginado) |
| `GET` | `/api/v1/communications/:id` | Detalle de un correo |
| `GET` | `/api/v1/communications/:id/attachments/:aid/download` | Pre-Signed URL (MinIO) para descargar |

---

## 5. Probar el login sin navegador (opcional)
Verifica que Keycloak emite tokens (Direct Access Grant):
```bash
curl -X POST http://localhost:8080/realms/sgc-realm/protocol/openid-connect/token \
  -d grant_type=password -d client_id=sgc-frontend -d client_secret=local-dev-secret \
  -d username=admin-sgc -d password='Admin123!' -d scope=openid
```
Debe devolver un `access_token`.

---

## 6. Comandos útiles

| Acción | Comando |
|--------|---------|
| Compilar todo | `pnpm build` |
| Desarrollo (todo) | `pnpm dev` |
| Lint | `pnpm lint` |
| Apagar infra | `docker compose down` |
| Apagar + borrar datos | `docker compose down -v` |
| Logs de un servicio | `docker compose logs -f keycloak` |

---

## 7. Notas

- **Tailwind v4:** el sistema de diseño (paleta + utilidades `.brutal-*`) se define con `@theme` en
  `apps/frontend/src/app/globals.css` (en v4 esto reemplaza a `tailwind.config.ts`).
- **Pipeline SRI:** la validación XSD usa los esquemas en `infrastructure/xsd/`. Si falta la
  librería nativa `libxmljs2`, se usa una validación estructural de respaldo.
- **Puertos:** el frontend usa **3005** para no chocar con el gateway (**3000**).
- **Pendiente:** Fase 7 (Terraform) y Fase 8 (CI/CD).
