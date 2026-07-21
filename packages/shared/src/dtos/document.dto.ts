/**
 * @fileoverview DTOs para comprobantes (documentos), ítems, impuestos y OCR.
 * @module document.dto
 */

import { DocumentType } from '../enums/document-type.enum';
import { DocumentStatus } from '../enums/document-status.enum';

export interface ICreateDocumentItemDto {
  readonly descripcion: string;
  readonly cantidad: number;
  readonly precioUnitario: number;
  readonly descuento?: number;
  readonly total: number;
}

export interface ICreateDocumentTaxDto {
  readonly codigo: string;
  readonly tarifa: number;
  readonly baseImponible: number;
  readonly valor: number;
}

/** DTO para crear/guardar un comprobante revisado por el humano. */
export interface ICreateDocumentDto {
  readonly documentType: DocumentType;
  readonly rucEmisor: string;
  readonly razonSocialEmisor?: string;
  readonly numeroFactura: string;
  readonly claveAcceso?: string;
  readonly fechaEmision?: string;
  readonly subtotal: number;
  readonly iva: number;
  readonly total: number;
  readonly items: ReadonlyArray<ICreateDocumentItemDto>;
  readonly taxes: ReadonlyArray<ICreateDocumentTaxDto>;
  /** Clave de almacenamiento en MinIO del archivo original (si aplica). */
  readonly storageKey?: string;
  /** XML limpio del comprobante (lo setea el import del SRI; no los formularios). */
  readonly xmlContent?: string;
}

/**
 * DTO para EDITAR un comprobante ya guardado (corregir montos/ítems).
 * El RUC emisor y el N° de factura NO se editan (son la identidad/unicidad).
 * Tras editar, el comprobante se REVALIDA automáticamente.
 */
export interface IUpdateDocumentDto {
  readonly documentType: DocumentType;
  readonly razonSocialEmisor?: string;
  readonly fechaEmision?: string;
  readonly subtotal: number;
  readonly iva: number;
  readonly total: number;
  readonly items: ReadonlyArray<ICreateDocumentItemDto>;
  readonly taxes: ReadonlyArray<ICreateDocumentTaxDto>;
}

export interface IDocumentItemDto extends ICreateDocumentItemDto {
  readonly id: string;
}

export interface IDocumentTaxDto extends ICreateDocumentTaxDto {
  readonly id: string;
}

/** Representación completa de un comprobante (respuesta). */
export interface IDocumentDto {
  readonly id: string;
  readonly documentType: DocumentType;
  readonly estado: DocumentStatus;
  readonly source: string;
  readonly rucEmisor: string;
  readonly razonSocialEmisor: string | null;
  readonly numeroFactura: string;
  readonly claveAcceso: string | null;
  readonly fechaEmision: string | null;
  readonly subtotal: number;
  readonly iva: number;
  readonly total: number;
  readonly items: ReadonlyArray<IDocumentItemDto>;
  readonly taxes: ReadonlyArray<IDocumentTaxDto>;
  /** Observaciones de la validación (motivo si quedó INCONSISTENTE). */
  readonly observaciones: string | null;
  /** XML limpio del comprobante (del SRI); null si no aplica. */
  readonly xmlContent: string | null;
  /** true si hay un archivo original en MinIO (foto OCR / adjunto IMAP). */
  readonly hasOriginal: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Tipo de fallo al importar una clave del SRI. */
export type ImportErrorKind = 'network' | 'not_authorized' | 'other';

/** Clave que falló al importar del SRI (staging en estado ERROR). */
export interface IImportErrorDto {
  readonly claveAcceso: string;
  readonly errorMessage: string;
  readonly fecha: string;
  /** Categoría del fallo (para UI y reintentos). */
  readonly kind: ImportErrorKind;
  /** true si es un fallo transitorio de red (merece reintento). */
  readonly retryable: boolean;
}

/** Resultado del OCR (datos pre-llenados para revisión humana). */
export interface IOcrResultDto {
  readonly rucEmisor: string;
  readonly razonSocialEmisor: string;
  readonly numeroFactura: string;
  readonly fechaEmision: string;
  readonly subtotal: number;
  readonly iva: number;
  readonly total: number;
  readonly items: ReadonlyArray<ICreateDocumentItemDto>;
  /** Clave en MinIO de la imagen subida (para adjuntarla al guardar). */
  readonly storageKey: string;
}

/** Respuesta paginada de comprobantes. */
export interface IPaginatedDocuments {
  readonly data: ReadonlyArray<IDocumentDto>;
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}
