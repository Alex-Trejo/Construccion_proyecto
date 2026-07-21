/**
 * @fileoverview Clasificación de errores de importación del SRI.
 *
 * Distingue fallos transitorios de RED (DNS/timeout → reintentables) de los de
 * NEGOCIO (el SRI no autoriza la clave → no reintentables). El `kind` se guarda
 * como prefijo `[kind]` en `incoming_invoices.error_message` para poder
 * recuperarlo al listar y al reintentar.
 *
 * @module import-error.util
 */

import type { ImportErrorKind } from '@sgc/shared';

/** Patrones de errores de red transitorios. */
const NETWORK_RE = /ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|ECONNABORTED|ECONNREFUSED|socket hang up|timeout|network/i;

/** Patrones de "no autorizado / no encontrado" en el SRI. */
const NOT_AUTHORIZED_RE = /no devolvi[oó] autorizaci[oó]n|no autoriz|NO AUTORIZADO|sin autorizaci[oó]n/i;

/** Clasifica un mensaje de error crudo en una categoría. */
export function classifyImportError(message: string): ImportErrorKind {
  if (NETWORK_RE.test(message)) return 'network';
  if (NOT_AUTHORIZED_RE.test(message)) return 'not_authorized';
  return 'other';
}

/** ¿La categoría es reintentable (fallo transitorio de red)? */
export function isRetryable(kind: ImportErrorKind): boolean {
  return kind === 'network';
}

/** Antepone el prefijo `[kind]` al mensaje para persistirlo. */
export function withKindPrefix(kind: ImportErrorKind, message: string): string {
  return `[${kind}] ${message}`;
}

/** Extrae `{ kind, message }` de un mensaje persistido (con o sin prefijo). */
export function parseStoredError(stored: string | null): {
  kind: ImportErrorKind;
  message: string;
} {
  const raw = stored ?? '';
  const match = raw.match(/^\[(network|not_authorized|other)\]\s?(.*)$/s);
  if (match) {
    return { kind: match[1] as ImportErrorKind, message: match[2] };
  }
  // Compatibilidad con mensajes antiguos sin prefijo: reclasificar por contenido.
  return { kind: classifyImportError(raw), message: raw };
}
