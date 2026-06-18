/**
 * @fileoverview Interfaces de dominio para el módulo de Documentos/Comprobantes.
 *
 * Representa un comprobante fiscal electrónico (XML/PDF) en el sistema.
 *
 * @module DocumentInterfaces
 */

import { DocumentStatus } from '../enums/document-status.enum';
import { DocumentType } from '../enums/document-type.enum';

/**
 * Representación de un comprobante fiscal en el sistema.
 */
export interface IDocument {
  /** UUID v4 del documento. */
  readonly id: string;

  /** Clave de acceso del comprobante (49 dígitos, asignada por el SRI). */
  readonly accessKey: string;

  /** Tipo de comprobante fiscal. */
  readonly documentType: DocumentType;

  /** Estado actual en el ciclo de vida. */
  readonly status: DocumentStatus;

  /** RUC del emisor del comprobante. */
  readonly issuerTaxId: string;

  /** Razón social del emisor. */
  readonly issuerName: string;

  /** Fecha de emisión del comprobante. */
  readonly issueDate: Date;

  /** Monto total del comprobante (sin impuestos). */
  readonly subtotal: number;

  /** Monto total de IVA. */
  readonly taxAmount: number;

  /** Monto total del comprobante (con impuestos). */
  readonly totalAmount: number;

  /** ID del proveedor asociado en el sistema. Null si aún no se ha vinculado. */
  readonly supplierId: string | null;

  /** Ruta del archivo XML en MinIO. */
  readonly xmlStoragePath: string | null;

  /** Ruta del archivo PDF en MinIO. */
  readonly pdfStoragePath: string | null;

  /** Origen del documento: manual (upload TXT) o automático (IMAP sync). */
  readonly source: DocumentSource;

  /** Fecha de ingreso al sistema. */
  readonly createdAt: Date;

  /** Fecha de última actualización. */
  readonly updatedAt: Date;
}

/**
 * Origen de ingreso del documento al sistema.
 */
export enum DocumentSource {
  /** Cargado manualmente vía TXT del SRI. */
  MANUAL_TXT = 'MANUAL_TXT',

  /** Descargado automáticamente vía IMAP (ms-sync). */
  IMAP_SYNC = 'IMAP_SYNC',

  /** Cargado manualmente como archivo individual. */
  MANUAL_UPLOAD = 'MANUAL_UPLOAD',
}
