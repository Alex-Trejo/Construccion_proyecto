/**
 * @fileoverview Tipos de respuesta del API Gateway consumidos por el frontend.
 *
 * Reflejan la forma JSON que ms-core devuelve (vía gateway) para el módulo
 * de Comunicaciones. Los tipos de Proveedores se reutilizan de @sgc/shared.
 *
 * @module types
 */

export interface EmailAttachment {
  readonly id: string;
  readonly filename: string;
  readonly extension: string;
  readonly contentType: string;
  readonly size: number;
}

export interface ReceivedEmail {
  readonly id: string;
  readonly emailFrom: string;
  readonly emailSubject: string;
  readonly emailDate: string;
  readonly emailMessageId: string;
  readonly attachments: ReadonlyArray<EmailAttachment>;
  readonly createdAt: string;
}

export interface PaginatedEmails {
  readonly data: ReadonlyArray<ReceivedEmail>;
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

export interface DownloadUrlResult {
  readonly url: string;
  readonly filename: string;
  readonly contentType: string;
  readonly size: number;
  readonly expiresInSeconds: number;
}

/**
 * Resultado de la carga masiva de un TXT del SRI.
 * (Reflejo de ProcessTxtBatchResult de ms-core; no vive en @sgc/shared.)
 */
export interface ProcessTxtBatchResult {
  readonly totalKeysFound: number;
  readonly newKeysRegistered: number;
  readonly duplicatesSkipped: number;
  readonly invalidKeysSkipped: number;
  readonly invalidKeys: ReadonlyArray<string>;
}

/** Respuesta de GET /documents/:id/preview (Pre-Signed URL). */
export interface DocumentPreviewResult {
  readonly url: string;
  readonly expiresInSeconds: number;
}
