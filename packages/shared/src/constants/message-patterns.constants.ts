/**
 * @fileoverview Patrones de mensajería TCP para comunicación inter-microservicio.
 *
 * Estos patrones se usan con @MessagePattern() en NestJS microservices
 * y con ClientProxy.send() en el API Gateway.
 *
 * Convención de nomenclatura:
 *   {SERVICIO}_{MÓDULO}_{ACCIÓN}
 *
 * Ejemplo de uso en ms-core (receptor):
 * ```ts
 * @MessagePattern(SUPPLIER_PATTERNS.CREATE)
 * async create(data: ICreateSupplierDto): Promise<ISupplier> { ... }
 * ```
 *
 * Ejemplo de uso en api-gateway (emisor):
 * ```ts
 * this.msCoreClient.send(SUPPLIER_PATTERNS.CREATE, dto);
 * ```
 *
 * @module MessagePatterns
 */

/** Patrones de mensajería para el módulo de Proveedores (ms-core). */
export const SUPPLIER_PATTERNS = {
  CREATE: 'CORE_SUPPLIER_CREATE',
  FIND_ALL: 'CORE_SUPPLIER_FIND_ALL',
  FIND_BY_ID: 'CORE_SUPPLIER_FIND_BY_ID',
  FIND_BY_TAX_ID: 'CORE_SUPPLIER_FIND_BY_TAX_ID',
  UPDATE: 'CORE_SUPPLIER_UPDATE',
  DEACTIVATE: 'CORE_SUPPLIER_DEACTIVATE',
} as const;

/** Patrones de mensajería para el módulo de Documentos (ms-core). */
export const DOCUMENT_PATTERNS = {
  UPLOAD: 'CORE_DOCUMENT_UPLOAD',
  UPLOAD_BATCH_TXT: 'CORE_DOCUMENT_UPLOAD_BATCH_TXT',
  FIND_ALL: 'CORE_DOCUMENT_FIND_ALL',
  FIND_BY_ID: 'CORE_DOCUMENT_FIND_BY_ID',
  FIND_BY_ACCESS_KEY: 'CORE_DOCUMENT_FIND_BY_ACCESS_KEY',
  UPDATE_STATUS: 'CORE_DOCUMENT_UPDATE_STATUS',
  FIND_BY_SUPPLIER: 'CORE_DOCUMENT_FIND_BY_SUPPLIER',
  /** OCR de comprobante físico (imagen → MinIO → OpenAI → datos). */
  PROCESS_PHYSICAL: 'CORE_DOCUMENT_PROCESS_PHYSICAL',
  /** Guarda un comprobante revisado (unicidad RUC + Nº factura). */
  CREATE: 'CORE_DOCUMENT_CREATE',
  /** Edita un comprobante ya guardado (corrige montos/ítems) y revalida. */
  EDIT: 'CORE_DOCUMENT_EDIT',
  /** Pre-Signed URL del archivo original. */
  PREVIEW: 'CORE_DOCUMENT_PREVIEW',
  /** KPIs del dashboard (Fase D). */
  METRICS: 'CORE_DOCUMENT_METRICS',
  /** Datos para exportación XLSX (Fase D). */
  EXPORT: 'CORE_DOCUMENT_EXPORT',
  /** Valida los comprobantes PENDIENTE/INCONSISTENTE del dueño. */
  VALIDATE_PENDING: 'CORE_DOCUMENT_VALIDATE_PENDING',
  /** Avanza el estado de un comprobante (consolidar / revalidar). */
  SET_STATUS: 'CORE_DOCUMENT_SET_STATUS',
  /** Lista las claves que fallaron al importar del SRI (staging ERROR). */
  LIST_IMPORT_ERRORS: 'CORE_DOCUMENT_LIST_IMPORT_ERRORS',
  /** Reintenta las claves en ERROR (resetea a PENDIENTE y reprocesa). */
  RETRY_IMPORTS: 'CORE_DOCUMENT_RETRY_IMPORTS',
} as const;

/** Patrones de mensajería para el módulo IMAP Sync (ms-sync). */
export const SYNC_PATTERNS = {
  /** Trigger manual de sincronización IMAP. */
  TRIGGER_SYNC: 'SYNC_IMAP_TRIGGER',

  /** Consultar estado de la última sincronización. */
  GET_STATUS: 'SYNC_IMAP_GET_STATUS',

  /** Evento emitido cuando ms-sync descarga un nuevo documento. */
  DOCUMENT_RECEIVED: 'SYNC_DOCUMENT_RECEIVED',
} as const;

/** Patrones de mensajería para el módulo de Comunicaciones (ms-core). */
export const COMMUNICATION_PATTERNS = {
  /** Lista paginada de correos recibidos. */
  LIST_EMAILS: 'CORE_COMMUNICATION_LIST_EMAILS',
  /** Detalle de un correo con sus adjuntos. */
  GET_EMAIL_DETAIL: 'CORE_COMMUNICATION_GET_EMAIL_DETAIL',
  /** Obtener Pre-Signed URL para descargar un adjunto. */
  GET_ATTACHMENT_URL: 'CORE_COMMUNICATION_GET_ATTACHMENT_URL',
} as const;

/** Patrones de mensajería para el módulo de Identidad (ms-core). */
export const IDENTITY_PATTERNS = {
  /** Sincroniza (upsert) un usuario de Keycloak en las shadow tables. */
  SYNC_USER: 'CORE_IDENTITY_SYNC_USER',
  /** Espeja (upsert) un rol de realm de Keycloak en la tabla roles. */
  UPSERT_ROLE: 'CORE_IDENTITY_UPSERT_ROLE',
  /** Marca como inactivo un rol espejado al borrarse en Keycloak. */
  DELETE_ROLE: 'CORE_IDENTITY_DELETE_ROLE',
} as const;

/** Patrones de mensajería para configuración IMAP por usuario (ms-core). */
export const IMAP_PATTERNS = {
  /** Guarda/actualiza la config IMAP del usuario (password cifrado). */
  SAVE_CONFIG: 'CORE_IMAP_SAVE_CONFIG',
  /** Lista las configs IMAP activas (para ms-sync; password cifrado). */
  LIST_ACTIVE: 'CORE_IMAP_LIST_ACTIVE',
  /** Devuelve la config IMAP del usuario (sin password). */
  GET_CONFIG: 'CORE_IMAP_GET_CONFIG',
  /** Elimina la config IMAP del usuario. */
  DELETE_CONFIG: 'CORE_IMAP_DELETE_CONFIG',
  /** Pausa/activa el escaneo del buzón del usuario. */
  SET_ACTIVE: 'CORE_IMAP_SET_ACTIVE',
  /** Prueba una conexión IMAP con credenciales dadas (login + logout). */
  TEST_CONNECTION: 'CORE_IMAP_TEST_CONNECTION',
} as const;

/** Tokens de inyección para ClientProxy de NestJS microservices. */
export const MICROSERVICE_TOKENS = {
  /** Token para inyectar el ClientProxy hacia ms-core. */
  MS_CORE_CLIENT: 'MS_CORE_CLIENT',

  /** Token para inyectar el ClientProxy hacia ms-sync. */
  MS_SYNC_CLIENT: 'MS_SYNC_CLIENT',
} as const;
