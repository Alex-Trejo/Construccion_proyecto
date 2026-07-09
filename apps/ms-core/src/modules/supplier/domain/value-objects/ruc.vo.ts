/**
 * @fileoverview Value Object — RUC/Cédula del proveedor.
 *
 * Encapsula la validación de negocio del identificador tributario:
 *   - RUC: 13 dígitos (para personas naturales y jurídicas).
 *   - Cédula: 10 dígitos (solo personas naturales).
 *
 * Inmutable. Si el valor no es válido, lanza excepción en el constructor.
 * Principio: "Make illegal states unrepresentable."
 *
 * @module Ruc
 */

import { DomainValidationError } from '../errors/domain-validation.error';

export class Ruc {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Crea un Value Object RUC validado.
   *
   * @param value - Cadena del RUC/Cédula a validar.
   * @returns Instancia de Ruc.
   * @throws {Error} Si el formato no es válido (10 o 13 dígitos numéricos).
   */
  public static create(value: string): Ruc {
    const sanitized = value.trim();

    if (!/^\d{10}$|^\d{13}$/.test(sanitized)) {
      throw new DomainValidationError(
        `RUC/Cédula inválido: "${sanitized}". Debe contener 10 dígitos (cédula) o 13 dígitos (RUC).`,
      );
    }

    // Validación del dígito verificador (módulo 10 para los primeros 10 dígitos)
    if (!Ruc.isValidCheckDigit(sanitized.substring(0, 10))) {
      throw new DomainValidationError(
        `RUC/Cédula inválido: "${sanitized}". El dígito verificador no es correcto.`,
      );
    }

    // Si es RUC (13 dígitos), los últimos 3 deben ser "001"
    if (sanitized.length === 13 && !sanitized.endsWith('001')) {
      throw new DomainValidationError(
        `RUC inválido: "${sanitized}". Un RUC debe terminar en "001".`,
      );
    }

    return new Ruc(sanitized);
  }

  /**
   * Valida el dígito verificador usando el algoritmo módulo 10
   * del SRI de Ecuador.
   */
  private static isValidCheckDigit(tenDigits: string): boolean {
    const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    const digits = tenDigits.split('').map(Number);
    const checkDigit = digits[9];

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      let product = digits[i] * coefficients[i];
      if (product >= 10) {
        product -= 9;
      }
      sum += product;
    }

    const computedCheck = (10 - (sum % 10)) % 10;
    return computedCheck === checkDigit;
  }

  /** Retorna el valor del RUC como string. */
  public get value(): string {
    return this._value;
  }

  /** Indica si es una cédula (10 dígitos). */
  public get isCedula(): boolean {
    return this._value.length === 10;
  }

  /** Indica si es un RUC completo (13 dígitos). */
  public get isRuc(): boolean {
    return this._value.length === 13;
  }

  /** Comparación por valor (no por referencia). */
  public equals(other: Ruc): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
