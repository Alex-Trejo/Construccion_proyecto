/**
 * @fileoverview Puerto — Validador estructural de XML contra XSD del SRI.
 *
 * Valida que un XML sanitizado cumpla con los esquemas oficiales XSD
 * publicados por el SRI de Ecuador (descargados offline).
 *
 * @module XmlValidatorPort
 */

/** Resultado de la validación XSD. */
export interface XmlValidationResult {
  /** true si el XML es válido contra el XSD. */
  readonly isValid: boolean;
  /** Lista de errores de validación (vacía si isValid es true). */
  readonly errors: ReadonlyArray<string>;
}

/** Contrato para el validador de XML contra XSD. */
export interface XmlValidatorPort {
  /**
   * Valida un XML sanitizado contra el esquema XSD correspondiente.
   *
   * @param xmlContent - XML limpio/sanitizado.
   * @param xsdPath - Ruta al archivo XSD offline.
   * @returns Resultado de la validación.
   */
  validateAgainstXsd(
    xmlContent: string,
    xsdPath: string,
  ): Promise<XmlValidationResult>;
}

export const XML_VALIDATOR_PORT = Symbol('XML_VALIDATOR_PORT');
