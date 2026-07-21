# Guía de pruebas E2E — SGC / FacturLink

Plan de pruebas **completo** para validar todo el sistema: roles, OCR, carga TXT→SRI,
IMAP, validación por estados, dashboard, exportación, admin y despliegue.
Marca cada casilla `[ ]` → `[x]` a medida que verificas.

---

## 0. Preparación del entorno

```bash
# 1) Infraestructura
docker compose up -d
docker compose ps                 # los 6 servicios en healthy

# 2) Apps (en watch)
pnpm install
pnpm build                        # debe dar 5/5 verde
pnpm dev                          # ms-core, ms-sync, api-gateway, frontend
```

Accesos:
- **App (frontend):** http://localhost:3005
- **Swagger (API):** http://localhost:3000/docs
- **Keycloak admin:** http://localhost:8080 (`admin` / `admin`)
- **Grafana:** http://localhost:3050 · **MinIO:** http://localhost:9001

> ⚠️ **Reinicia `ms-core`** si venías de una versión anterior, para que `synchronize`
> cree las columnas nuevas (`observaciones`, `xml_content`) y cargue el código nuevo.

### Usuarios de prueba

| Usuario | Contraseña | Rol | Sembrado |
|---|---|---|---|
| `admin-sgc` | `Admin123!` | Administrador | ✅ en el realm |
| `contador-sgc` | `Contador123!` | Contador | ✅ en el realm |
| `asistente-sgc` | *(la que definas)* | Asistente | ❌ **créalo en la prueba 4.2** |

- [ ] Infra healthy, `pnpm build` 5/5, apps corriendo.
- [ ] Login manual funciona en http://localhost:3005.

---

## 1. Matriz de permisos esperada (referencia)

| Acción | Administrador | Asistente | Contador |
|---|:---:|:---:|:---:|
| Ver dashboard / listados / detalle | ✅ | ✅ | ✅ |
| Exportar XLSX | ✅ | ✅ | ✅ |
| Subir foto (OCR) / TXT / Nuevo manual | ✅ | ✅ | ❌ |
| Crear / editar / eliminar Proveedores | ✅ | ✅ | ❌ |
| Validar pendientes / Revalidar / Reintentar import | ✅ | ✅ | ❌ |
| **Consolidar** (VALIDADO→CONSOLIDADO) | ✅ | ❌ | ✅ |
| Config. correo (IMAP) propia | ✅ | ✅ | ✅ |
| Administrar Usuarios / Roles | ✅ | ❌ | ❌ |

> El backend valida cada petición (403 si no corresponde); la UI además oculta lo no permitido.

---

## 2. Autenticación (RF01 / RNF01)

- [ ] En `/` el botón **Login** (Hero) redirige a Keycloak y vuelve al dashboard.
- [ ] Cerrar sesión limpia la sesión (al volver a entrar pide credenciales).
- [ ] (Opcional) Obtener token por API y ver que trae los roles:
```bash
curl -s -X POST http://localhost:8080/realms/sgc-realm/protocol/openid-connect/token \
  -d grant_type=password -d client_id=sgc-frontend -d client_secret=local-dev-secret \
  -d username=admin-sgc -d password='Admin123!' -d scope=openid | jq -r .access_token
```

---

## 3. Internacionalización (i18n ES/EN)

- [ ] El toggle **ES/EN** (arriba a la derecha) cambia TODOS los textos.
- [ ] Recorrer cada pantalla en EN: no debe quedar ninguna clave cruda (ej. `documents.title`).
- [ ] La preferencia persiste al recargar (localStorage `sgc.lang`).

---

## 4. Roles y control de acceso (RNF03) — **prueba central**

### 4.1 Como Administrador (`admin-sgc`)
- [ ] El nav muestra **Usuarios** y **Roles** (solo admin los ve).
- [ ] Puede entrar a todas las secciones.

### 4.2 Crear el usuario Asistente (desde Admin)
- [ ] Nav → **Usuarios** → **+ Nuevo usuario**: usuario `asistente-sgc`, correo, contraseña, **Rol inicial = Asistente**.
- [ ] Aparece en la tabla con el badge **Asistente**.

### 4.3 Como Asistente (`asistente-sgc`)
- [ ] El nav **NO** muestra Usuarios ni Roles.
- [ ] En **Comprobantes** ve los botones Subir foto / TXT / Nuevo manual / Validar pendientes / Reintentar.
- [ ] En **Proveedores** puede crear / editar / eliminar.
- [ ] En el detalle de un comprobante VALIDADO **NO** aparece "Consolidar".
- [ ] Forzar 403 (opcional, Swagger o curl con token de Asistente):
  `POST /api/v1/documents/:id/consolidate` → **403 Forbidden**.

### 4.4 Como Contador (`contador-sgc`)
- [ ] El nav **NO** muestra Usuarios ni Roles.
- [ ] En **Comprobantes** **NO** ve Subir foto / TXT / Nuevo manual / Validar (solo Exportar / Actualizar / Ver errores).
- [ ] En **Proveedores** **NO** ve el formulario ni botones editar/eliminar (solo la lista).
- [ ] En el detalle de un comprobante **VALIDADO** **SÍ** aparece **"Consolidar"**.
- [ ] Puede **Exportar XLSX**.
- [ ] Forzar 403 (opcional): `POST /api/v1/documents/physical` con token de Contador → **403**.

---

## 5. Proveedores (RF: catálogo, Factory Method)

*(Como Administrador o Asistente)*
- [ ] Crear **Persona Jurídica**: RUC 13 dígitos, razón social, etc. → se crea con `supplierCode` generado.
- [ ] Crear **Persona Natural**: cédula 10 dígitos, nombres/apellidos.
- [ ] Validación: RUC con letras o longitud incorrecta → mensaje de error (no envía).
- [ ] **Editar** un proveedor (email/teléfono/dirección) → se refleja en la lista.
- [ ] **Eliminar** (baja lógica) con confirmación → desaparece de la lista.

---

## 6. Comprobantes — OCR (RF02)

*(Administrador / Asistente)*
- [ ] **Subir foto (OCR)** → seleccionar imagen (JPG/PNG) de una factura.
- [ ] Estado "Procesando imagen…" ágil; luego abre el **modal de revisión** con datos extraídos
      (RUC, razón social, **N° de factura**, fecha, subtotal, IVA, total, ítems).
- [ ] Corregir algún dato y **Guardar** → aparece en el listado.
- [ ] El comprobante queda **VALIDADO** (o INCONSISTENTE si los totales no cuadran).

---

## 7. Comprobantes — Carga masiva TXT → SRI (RF04 + validación)

*(Administrador / Asistente)*. Requiere **internet** hacia el SRI.
- [ ] **Carga masiva TXT** → subir el TXT "Recibidos" del SRI.
- [ ] El modal muestra "Nuevas en cola: N" + aviso de procesamiento en segundo plano.
- [ ] La lista se va llenando sola (polling) o con **↻ Actualizar** (~1 min).
- [ ] Los comprobantes creados tienen **estado VALIDADO** (validación automática por totales).
- [ ] Abrir un detalle → sección **"XML del SRI"** con el XML; **"Previsualizar PDF"** muestra el RIDE (desde MinIO).

### 7.1 Errores de importación clasificados (RF: robustez)
- [ ] **Ver errores de importación** → tabla con columna **Tipo**:
  - Badge ámbar **"Red · reintentable"** (fallos de DNS/timeout).
  - Badge rojo **"No autorizado"** (el SRI no autoriza esa clave).
- [ ] El botón **"↻ Reintentar importación"** aparece solo si hay errores **reintentables** y
      reprocesa **solo los de red** (los "no autorizado" se quedan).

---

## 8. Comprobantes — Nuevo manual + Unicidad (RF05)

*(Administrador / Asistente)*
- [ ] **Nuevo manual**: crear un comprobante con N° `001-002-000000123`, RUC, totales que cuadren
      (subtotal + IVA = total) → queda **VALIDADO**.
- [ ] Crear otro con totales que **NO** cuadren → queda **INCONSISTENTE** y el detalle muestra
      las **observaciones** del motivo.
- [ ] **Prueba clave de duplicados (RF05):** intentar crear otro con **el mismo RUC** y N° `001002123`
      (sin guiones) → **rechazado por duplicado** (la normalización los trata como el mismo).

---

## 9. Máquina de estados de validación

- [ ] Un comprobante **INCONSISTENTE** → botón **"Revalidar"** (Asistente/Admin) reejecuta la validación.
- [ ] Un comprobante **VALIDADO** → botón **"Consolidar"** (Contador/Admin) → pasa a **CONSOLIDADO**.
- [ ] Intentar consolidar algo que no está VALIDADO no debe permitirlo (transición inválida).
- [ ] **"Validar pendientes"** (Asistente/Admin) valida en lote todos los PENDIENTE/INCONSISTENTE.

Badges de estado esperados: PENDIENTE/EN_VALIDACION (ámbar) · VALIDADO/CONSOLIDADO (verde) · INCONSISTENTE/RECHAZADO (rojo).

---

## 10. Detalle del comprobante

- [ ] Cabecera: RUC, razón social, clave de acceso, fecha, subtotal, IVA, total.
- [ ] Tabla de **ítems** y de **impuestos**.
- [ ] **Previsualizar PDF** (click) → muestra el RIDE embebido; **Abrir en pestaña** funciona.
- [ ] **"Ver original"** aparece **solo** si hay archivo original (foto OCR / adjunto IMAP), no en los del TXT.
- [ ] Si INCONSISTENTE, se muestra la alerta de **observaciones**.

---

## 11. Dashboard + Filtros (RF07)

- [ ] KPIs: **Total gastado** y **N° comprobantes** coinciden con lo cargado.
- [ ] Gráficos **por mes** y **por estado** (barras CSS) con color por estado.
- [ ] **Filtros**: elegir un rango de fecha (Desde/Hasta) y un **Tipo de comprobante** → **Aplicar**
      → los KPIs y gráficos cambian. **Limpiar** los resetea.

---

## 12. Exportación XLSX (RF08)

- [ ] **Exportar XLSX** descarga `comprobantes.xlsx` con columnas: Tipo, RUC, Razón social, N° factura, Fecha, Subtotal, IVA, Total, Estado.
- [ ] Abrirlo en Excel/LibreOffice: los datos coinciden con la lista.

---

## 13. Configuración de correo IMAP (RF03) + recepción

*(Cualquier usuario configura el suyo)*
- [ ] Nav → **Config. correo**: elegir **Proveedor** (Gmail/Outlook/Yahoo/iCloud/Otro).
- [ ] Al elegir Gmail, **Servidor** y **Puerto** se autocompletan y quedan bloqueados; con "Otro" son editables.
- [ ] El campo contraseña muestra el aviso de **App Password de 16 caracteres**.
- [ ] Guardar → mensaje de éxito; la contraseña NO se muestra (cifrada AES-256-GCM).
- [ ] **Recepción (con un buzón real con 1-3 facturas sin leer):**
  - [ ] En ~1 ciclo, la factura aparece en **Comunicaciones** (con adjuntos descargables).
  - [ ] Y **también** en **Comprobantes** (unificación IMAP→documentos), validada y con RIDE PDF.
  - [ ] Subir el mismo comprobante por TXT → **no se duplica**.

> Consejo: en Gmail, marca como leídos los correos que no quieras procesar y deja 2-3 facturas sin leer.

---

## 14. Comunicaciones (correos recibidos)

- [ ] Lista paginada de correos con remitente, asunto, fecha y adjuntos.
- [ ] Click en un adjunto → descarga directa (Pre-Signed URL de MinIO).

---

## 15. Administración (solo Administrador)

- [ ] **Usuarios**: listar, **crear** (con rol inicial), **gestionar roles** (marcar/desmarcar y guardar).
- [ ] **Roles**: listar, **crear** un rol nuevo, **eliminar** un rol (con confirmación).
- [ ] Como Asistente/Contador, entrar a `/dashboard/admin/users` redirige a `/dashboard` (guard).

---

## 16. Observabilidad (opcional)

- [ ] Grafana (http://localhost:3050) → dashboard **SGC — Overview**.
- [ ] Explore → Loki `{app="ms-sync"}` mientras corre el cron IMAP.
- [ ] Prometheus (http://localhost:9090) → Status → Targets (ms-core/gateway UP).

---

## 17. Verificaciones en base de datos

```bash
docker exec sgc-postgres psql -U sgc_user -d sgc_db \
  -c "SELECT estado, count(*) FROM documents GROUP BY estado;" \
  -c "SELECT count(*) AS con_xml FROM documents WHERE xml_content IS NOT NULL;" \
  -c "SELECT numero_factura FROM documents ORDER BY created_at DESC LIMIT 5;" \
  -c "SELECT estado, count(*) FROM incoming_invoices GROUP BY estado;" \
  -c "SELECT DISTINCT left(error_message, 20) AS tipo, count(*) FROM incoming_invoices WHERE estado='ERROR' GROUP BY 1;"
```

Esperado:
- [ ] `documents.estado` mayormente **VALIDADO/CONSOLIDADO** (no todo PENDIENTE).
- [ ] `numero_factura` en formato canónico `EEE-PPP-SSSSSSSSS`.
- [ ] Errores de import con prefijo `[network]` / `[not_authorized]`.

---

## 18. Despliegue de producción (opcional — RNF02)

Ver **`DEPLOY.md`**. Resumen:
- [ ] `cp .env.production.example .env` y completar (DOMAIN, secretos nuevos, CORS_ORIGIN).
- [ ] `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`.
- [ ] **Caddy** sirve `https://<DOMAIN>` con TLS; `/api/v1/*`→gateway, resto→frontend.
- [ ] El gateway rechaza orígenes fuera de `CORS_ORIGIN`.
- [ ] **Rotar secretos** del checklist (OPENAI_API_KEY, ENCRYPTION_KEY, Keycloak secret, …).

---

## Resumen de criterios de aceptación

| Requisito | Criterio | OK |
|---|---|:--:|
| RF01 / RNF01 / RNF03 | Login Keycloak + matriz de roles respetada (§4) | [ ] |
| RF02 | OCR extrae datos (incl. N°) y se guarda | [ ] |
| RF03 | IMAP descarga y crea Comprobante | [ ] |
| RF04 | Carga TXT → consulta SRI → comprobante | [ ] |
| RF05 | Duplicado bloqueado con N° normalizado | [ ] |
| RF06 | Corrección OCR + estado INCONSISTENTE→VALIDADO | [ ] |
| RF07 | Dashboard con filtros fecha/tipo | [ ] |
| RF08 | Exportación XLSX (con filtros) | [ ] |
| Validación | Máquina de estados + Consolidar (Contador) | [ ] |
| Despliegue | Caddy TLS + CORS + secretos rotados | [ ] |
