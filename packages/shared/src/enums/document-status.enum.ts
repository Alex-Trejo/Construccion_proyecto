/**
 * @fileoverview Estado del ciclo de vida de un comprobante/documento fiscal.
 *
 * Flujo del estado:
 *   PENDIENTE → EN_VALIDACION → VALIDADO → CONSOLIDADO
 *                             → INCONSISTENTE → (corrección manual) → EN_VALIDACION
 *                             → RECHAZADO (terminal)
 *
 * @module DocumentStatus
 */

export enum DocumentStatus {
  /** Documento recibido, pendiente de procesamiento. */
  PENDIENTE = 'PENDIENTE',

  /** Documento en proceso de validación contra el SRI. */
  EN_VALIDACION = 'EN_VALIDACION',

  /** Documento con inconsistencias detectadas (datos no coinciden con SRI). */
  INCONSISTENTE = 'INCONSISTENTE',

  /** Documento rechazado definitivamente (no válido ante el SRI). */
  RECHAZADO = 'RECHAZADO',

  /** Documento validado correctamente contra el SRI. */
  VALIDADO = 'VALIDADO',

  /** Documento consolidado en el reporte fiscal final. */
  CONSOLIDADO = 'CONSOLIDADO',
}
