/**
 * @fileoverview Puerto — Sanitizador de XML de comprobantes electrónicos.
 *
 * Los XML del SRI de Ecuador y los descargados de Gmail suelen venir
 * "sucios" con: firma electrónica, CDATA, HTML entities anidados,
 * caracteres BOM, line breaks, etc.
 *
 * ⚠️ NOTA SOBRE LA FIRMA DIGITAL:
 * Los XSD oficiales del SRI importan `xmldsig-core-schema.xsd`, lo que
 * significa que el nodo <ds:Signature> ES PARTE del esquema válido.
 * Por eso, el sanitizador tiene 2 modos:
 *   - sanitize(): Limpia TODO incluyendo la firma (para parsing de datos).
 *   - sanitizeKeepSignature(): Limpia sin quitar la firma (para validación XSD).
 *
 * @module XmlSanitizerPort
 */

/** Contrato para el sanitizador de XML. */
export interface XmlSanitizerPort {
  /**
   * Limpia un XML crudo MANTENIENDO la firma digital.
   * Usar antes de validar contra XSD (porque el XSD espera la firma).
   *
   * Operaciones:
   *   1. Eliminar BOM y caracteres de control
   *   2. Decodificar HTML entities anidados
   *   3. Eliminar wrappers CDATA
   *   4. Normalizar whitespace
   *   5. Asegurar declaración XML
   *   ❌ NO elimina <ds:Signature>
   *
   * @param rawXml - XML crudo.
   * @returns XML limpio CON firma, listo para validar contra XSD.
   */
  sanitizeKeepSignature(rawXml: string): string;

  /**
   * Limpia un XML crudo ELIMINANDO la firma digital.
   * Usar después de validar contra XSD, para parsear los datos fiscales.
   *
   * Operaciones:
   *   1. Todo lo de sanitizeKeepSignature()
   *   2. ✅ Elimina <ds:Signature>...</ds:Signature>
   *
   * @param rawXml - XML crudo o ya pre-sanitizado.
   * @returns XML limpio SIN firma, listo para parsear datos fiscales.
   */
  sanitize(rawXml: string): string;
}

export const XML_SANITIZER_PORT = Symbol('XML_SANITIZER_PORT');
