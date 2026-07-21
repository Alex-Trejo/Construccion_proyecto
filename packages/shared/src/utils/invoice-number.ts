/**
 * @fileoverview Normalización del número de comprobante del SRI (Ecuador).
 *
 * El número tiene la forma estab(3)-ptoEmi(3)-secuencial(9) = 15 dígitos
 * (p. ej. 001-002-000000123). Distintas fuentes (OCR, TXT, XML, digitación
 * manual) lo escriben con o sin guiones y con distinto padding, lo que rompía
 * la unicidad (RF05): "001-002-123" y "001002123" se trataban como distintos.
 *
 * Esta función produce un CANÓNICO estable para comparar y almacenar.
 *
 * @module invoice-number
 */

/**
 * Devuelve el número de comprobante en forma canónica:
 *   - Quita todo lo que no sea dígito.
 *   - Si quedan 15 dígitos, formatea `EEE-PPP-SSSSSSSSS`.
 *   - Si quedan menos, rellena estab/ptoEmi a 3 y el secuencial a 9 cuando es
 *     razonable (≤ 15 dígitos), para que "001-002-123" ≡ "001002000000123"…
 *     en caso contrario devuelve solo los dígitos.
 *
 * @param raw Número tal como viene (con guiones, espacios, etc.).
 * @returns Número canónico; cadena vacía si no hay dígitos.
 */
export function normalizeInvoiceNumber(raw: string | null | undefined): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length === 0) return '';

  // Caso completo: 15 dígitos → formato estándar del SRI.
  if (digits.length === 15) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Casos parciales frecuentes: los primeros 6 dígitos suelen ser estab+ptoEmi.
  // Si hay al menos 6, rellenamos el secuencial a 9 para canonizar.
  if (digits.length > 6 && digits.length < 15) {
    const estab = digits.slice(0, 3).padStart(3, '0');
    const ptoEmi = digits.slice(3, 6).padStart(3, '0');
    const secuencial = digits.slice(6).padStart(9, '0');
    return `${estab}-${ptoEmi}-${secuencial}`;
  }

  // No se puede inferir la estructura: se conservan los dígitos como clave estable.
  return digits;
}
