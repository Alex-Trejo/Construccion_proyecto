/**
 * @fileoverview Tipos de comprobantes fiscales electrónicos del SRI.
 *
 * Basado en los tipos de documentos definidos por el Servicio de Rentas
 * Internas (SRI) de Ecuador.
 *
 * @module DocumentType
 */

export enum DocumentType {
  /** Factura electrónica. */
  FACTURA = 'FACTURA',

  /** Nota de crédito electrónica. */
  NOTA_CREDITO = 'NOTA_CREDITO',

  /** Nota de débito electrónica. */
  NOTA_DEBITO = 'NOTA_DEBITO',

  /** Comprobante de retención electrónico. */
  RETENCION = 'RETENCION',

  /** Guía de remisión electrónica. */
  GUIA_REMISION = 'GUIA_REMISION',

  /** Liquidación de compra electrónica. */
  LIQUIDACION_COMPRA = 'LIQUIDACION_COMPRA',
}
