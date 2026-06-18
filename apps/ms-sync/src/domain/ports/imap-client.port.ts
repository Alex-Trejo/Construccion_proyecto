/**
 * @fileoverview Puerto — Cliente IMAP para extracción de correos.
 *
 * Define el contrato para conectarse a un buzón IMAP, buscar
 * correos no leídos, extraer adjuntos (XML/PDF) y marcar como leídos.
 *
 * Clean Architecture:
 *   - Este puerto vive en Domain.
 *   - ImapClientAdapter (Infrastructure) lo implementa usando ImapFlow.
 *   - EmailSyncCronService (Application) depende solo de este puerto.
 *
 * @module ImapClientPort
 */

/** Adjunto extraído de un correo electrónico. */
export interface EmailAttachment {
  /** Nombre original del archivo (ej: "factura_001.xml"). */
  readonly filename: string;
  /** Extensión del archivo en minúsculas (ej: "xml", "pdf"). */
  readonly extension: string;
  /** Contenido del archivo como Buffer. */
  readonly content: Buffer;
  /** MIME type del adjunto (ej: "application/xml"). */
  readonly contentType: string;
  /** Tamaño en bytes. */
  readonly size: number;
}

/** Metadata del correo electrónico procesado. */
export interface EmailMetadata {
  /** UID del mensaje IMAP (para referencia). */
  readonly uid: number;
  /** Dirección del remitente. */
  readonly from: string;
  /** Asunto del correo. */
  readonly subject: string;
  /** Fecha de recepción. */
  readonly date: Date;
  /** Message-ID del correo (para deduplicación). */
  readonly messageId: string;
}

/** Correo procesado con su metadata y adjuntos filtrados. */
export interface ProcessedEmail {
  readonly metadata: EmailMetadata;
  readonly attachments: ReadonlyArray<EmailAttachment>;
}

/** Contrato para el cliente IMAP. */
export interface ImapClientPort {
  /**
   * Conecta al servidor IMAP, busca correos UNSEEN con adjuntos
   * XML/PDF, los extrae y marca los correos como SEEN.
   *
   * @returns Array de correos procesados con sus adjuntos.
   * @throws {Error} Si la conexión IMAP falla.
   */
  fetchUnseenWithAttachments(): Promise<ReadonlyArray<ProcessedEmail>>;
}

export const IMAP_CLIENT_PORT = Symbol('IMAP_CLIENT_PORT');
