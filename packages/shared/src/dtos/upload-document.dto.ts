/**
 * @fileoverview DTO para la subida de documentos/comprobantes.
 *
 * @module UploadDocumentDto
 */

import { DocumentType } from '../enums/document-type.enum';

/**
 * DTO para subir un documento fiscal al sistema.
 * Usado tanto en carga manual (TXT) como en sincronización IMAP.
 */
export interface IUploadDocumentDto {
  /** Clave de acceso del comprobante (49 dígitos). */
  readonly accessKey: string;

  /** Tipo de comprobante fiscal. */
  readonly documentType: DocumentType;

  /** RUC del emisor. */
  readonly issuerTaxId: string;

  /** Razón social del emisor. */
  readonly issuerName: string;

  /** Fecha de emisión del comprobante (ISO 8601). */
  readonly issueDate: string;

  /** Monto subtotal. */
  readonly subtotal: number;

  /** Monto IVA. */
  readonly taxAmount: number;

  /** Monto total. */
  readonly totalAmount: number;

  /** Contenido del XML codificado en Base64 (opcional si es carga TXT). */
  readonly xmlBase64?: string;

  /** Contenido del PDF codificado en Base64 (opcional). */
  readonly pdfBase64?: string;
}
