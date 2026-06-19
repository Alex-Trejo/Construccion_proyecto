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
  readonly createdAt: Date;
  readonly updatedAt: Date;
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
