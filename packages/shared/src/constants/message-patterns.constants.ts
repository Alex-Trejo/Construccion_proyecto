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

/** Tokens de inyección para ClientProxy de NestJS microservices. */
export const MICROSERVICE_TOKENS = {
  /** Token para inyectar el ClientProxy hacia ms-core. */
  MS_CORE_CLIENT: 'MS_CORE_CLIENT',

  /** Token para inyectar el ClientProxy hacia ms-sync. */
  MS_SYNC_CLIENT: 'MS_SYNC_CLIENT',
} as const;
