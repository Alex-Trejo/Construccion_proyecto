/**
 * @fileoverview Puerto — OCR de comprobantes (extracción de datos de imagen).
 * @module OcrPort
 */

import { type IOcrResultDto } from '@sgc/shared';

export interface OcrPort {
  /**
   * Extrae los datos fiscales de la imagen de un comprobante.
   *
   * La imagen se envía INLINE (base64 data URI), no como URL: así el proveedor
   * OCR no necesita alcanzar MinIO por red (que es interno/local).
   *
   * @param content - Bytes de la imagen.
   * @param contentType - MIME (image/png, image/jpeg…).
   * @param storageKey - Clave del objeto en MinIO (se devuelve en el resultado).
   */
  extractFromImage(
    content: Buffer,
    contentType: string,
    storageKey: string,
  ): Promise<IOcrResultDto>;
}

export const OCR_PORT = Symbol('OCR_PORT');
