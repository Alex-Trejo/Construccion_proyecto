/**
 * @fileoverview Servicio de dominio — reglas de validación fiscal de un comprobante.
 *
 * El comprobante ya viene AUTORIZADO por el SRI y validado contra XSD, así que
 * la validación interna del SGC comprueba la CONSISTENCIA de los totales.
 *
 * @module DocumentValidationService
 */

import { Injectable } from '@nestjs/common';
import { DocumentStatus } from '@sgc/shared';

/** Datos fiscales mínimos para validar un comprobante. */
export interface ValidatableDocument {
  readonly subtotal: number;
  readonly iva: number;
  readonly total: number;
  readonly items: ReadonlyArray<{ readonly total: number }>;
}

/** Resultado de la validación. */
export interface ValidationOutcome {
  readonly status: DocumentStatus.VALIDADO | DocumentStatus.INCONSISTENTE;
  readonly issues: ReadonlyArray<string>;
}

/** Tolerancias de redondeo (USD, 2 decimales). */
const TOTAL_TOLERANCE = 0.02;
const ITEMS_TOLERANCE = 0.05;

@Injectable()
export class DocumentValidationService {
  /**
   * Evalúa un comprobante. Devuelve VALIDADO si los totales cuadran, o
   * INCONSISTENTE con la lista de observaciones detectadas.
   */
  evaluate(doc: ValidatableDocument): ValidationOutcome {
    const issues: string[] = [];

    // Regla A: subtotal + iva ≈ total.
    const expectedTotal = doc.subtotal + doc.iva;
    if (Math.abs(expectedTotal - doc.total) > TOTAL_TOLERANCE) {
      issues.push(
        `Totales no cuadran: subtotal (${doc.subtotal.toFixed(2)}) + IVA ` +
          `(${doc.iva.toFixed(2)}) = ${expectedTotal.toFixed(2)}, pero el total ` +
          `es ${doc.total.toFixed(2)}.`,
      );
    }

    // Regla B: la suma de los ítems ≈ subtotal (solo si hay ítems).
    if (doc.items.length > 0) {
      const itemsSum = doc.items.reduce((sum, i) => sum + i.total, 0);
      if (Math.abs(itemsSum - doc.subtotal) > ITEMS_TOLERANCE) {
        issues.push(
          `La suma de los ítems (${itemsSum.toFixed(2)}) no coincide con el ` +
            `subtotal (${doc.subtotal.toFixed(2)}).`,
        );
      }
    }

    return {
      status: issues.length === 0 ? DocumentStatus.VALIDADO : DocumentStatus.INCONSISTENTE,
      issues,
    };
  }
}
