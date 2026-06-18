/**
 * @fileoverview Enums adicionales para el flujo de procesamiento de facturas.
 * @module InvoiceEnums
 */

/** Origen de ingreso de la factura al staging. */
export enum InvoiceOrigin {
  /** Clave extraída de un archivo TXT del SRI. */
  TXT = 'TXT',
  /** Descargada automáticamente vía IMAP (ms-sync). */
  EMAIL = 'EMAIL',
}

/** Estado de procesamiento de una factura en staging. */
export enum InvoiceProcessingStatus {
  /** Registrada, pendiente de descarga XML. */
  PENDIENTE = 'PENDIENTE',
  /** XML descargado y sanitizado exitosamente. */
  PROCESADO = 'PROCESADO',
  /** Error al descargar o procesar el XML. */
  ERROR = 'ERROR',
}

/** Tipo de contribuyente según el SRI. */
export enum ContributorType {
  PERSONA_NATURAL = 'PERSONA_NATURAL',
  SOCIEDAD = 'SOCIEDAD',
}

/** Régimen tributario del contribuyente. */
export enum TaxRegime {
  GENERAL = 'GENERAL',
  RIMPE_EMPRENDEDOR = 'RIMPE_EMPRENDEDOR',
  RIMPE_NEGOCIO_POPULAR = 'RIMPE_NEGOCIO_POPULAR',
}
