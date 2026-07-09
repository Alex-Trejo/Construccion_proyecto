/**
 * @fileoverview Error de validación de dominio.
 *
 * Representa una violación de una regla de negocio provocada por datos de
 * entrada inválidos (p. ej. RUC/Cédula o teléfono con formato incorrecto).
 *
 * Se distingue de un `Error` genérico para que la capa de presentación pueda
 * mapearlo a un 400 Bad Request con un mensaje claro para el usuario, en lugar
 * de un 500 "Internal server error".
 *
 * @module DomainValidationError
 */

export class DomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainValidationError';
    // Mantiene la cadena de prototipos correcta al transpilar a ES5/ES2015.
    Object.setPrototypeOf(this, DomainValidationError.prototype);
  }
}
