/**
 * @fileoverview Reglas de transición de la máquina de estados de un comprobante.
 *
 * Flujo del ERS:
 *   PENDIENTE → EN_VALIDACION → VALIDADO → CONSOLIDADO
 *                             ↘ INCONSISTENTE → EN_VALIDACION
 *                             ↘ RECHAZADO (terminal)
 *
 * @module document-status.rules
 */

import { DocumentStatus } from '@sgc/shared';

/** Transiciones permitidas desde cada estado. */
export const ALLOWED_TRANSITIONS: Readonly<Record<DocumentStatus, ReadonlyArray<DocumentStatus>>> = {
  [DocumentStatus.PENDIENTE]: [DocumentStatus.EN_VALIDACION],
  [DocumentStatus.EN_VALIDACION]: [
    DocumentStatus.VALIDADO,
    DocumentStatus.INCONSISTENTE,
    DocumentStatus.RECHAZADO,
  ],
  [DocumentStatus.INCONSISTENTE]: [DocumentStatus.EN_VALIDACION],
  [DocumentStatus.VALIDADO]: [DocumentStatus.CONSOLIDADO],
  [DocumentStatus.CONSOLIDADO]: [],
  [DocumentStatus.RECHAZADO]: [],
};

/** ¿Es válida la transición `from → to`? */
export function canTransition(from: DocumentStatus, to: DocumentStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Lanza un Error si la transición `from → to` no está permitida. */
export function assertTransition(from: DocumentStatus, to: DocumentStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Transición de estado no permitida: ${from} → ${to}.`,
    );
  }
}
