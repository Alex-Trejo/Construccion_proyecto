/**
 * @fileoverview Puerto — OCR de comprobantes (extracción de datos de imagen).
 * @module OcrPort
 */

import { type IOcrResultDto } from '@sgc/shared';

export interface OcrPort {
  /**
   * Extrae los datos fiscales de la imagen de un comprobante.
   * @param imageUrl - URL accesible de la imagen (Pre-Signed de MinIO).
   * @param storageKey - Clave del objeto en MinIO (se devuelve en el resultado).
   */
  extractFromImageUrl(
    imageUrl: string,
    storageKey: string,
  ): Promise<IOcrResultDto>;
}

export const OCR_PORT = Symbol('OCR_PORT');
