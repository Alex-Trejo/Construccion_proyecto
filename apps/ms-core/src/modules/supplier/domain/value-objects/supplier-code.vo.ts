/**
 * @fileoverview Value Object — Código de Proveedor.
 *
 * Se genera AUTOMÁTICAMENTE a partir de los datos que ingresa el usuario
 * (tipo de proveedor + RUC/Cédula), con el formato:
 *   {TIPO}-{TAXID}
 *
 * Ejemplos:
 *   - NAT-1710034065   (Persona Natural, cédula/RUC)
 *   - JUR-1790012345001 (Persona Jurídica, RUC)
 *
 * Es determinístico y único (el RUC/Cédula es único por proveedor),
 * legible y acotado en longitud. Inmutable.
 *
 * @module SupplierCode
 */

import { SupplierType } from '@sgc/shared';

export class SupplierCode {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /** Prefijo según el tipo de proveedor. */
  private static prefixFor(supplierType: SupplierType): 'NAT' | 'JUR' {
    return supplierType === SupplierType.PERSONA_NATURAL ? 'NAT' : 'JUR';
  }

  /**
   * Genera el código a partir de los datos ingresados por el usuario.
   *
   * @param supplierType - Tipo de proveedor (discriminador).
   * @param taxId - RUC (13 dígitos) o Cédula (10 dígitos) ya validado.
   * @returns Nueva instancia de SupplierCode.
   */
  public static generate(
    supplierType: SupplierType,
    taxId: string,
  ): SupplierCode {
    const code = `${SupplierCode.prefixFor(supplierType)}-${taxId.trim()}`;
    return new SupplierCode(code);
  }

  /**
   * Reconstruye un SupplierCode existente desde la base de datos.
   *
   * @param value - Código existente (formato {NAT|JUR}-{10|13 dígitos}).
   * @returns Instancia de SupplierCode.
   * @throws {Error} Si el formato no coincide con el patrón esperado.
   */
  public static fromExisting(value: string): SupplierCode {
    const pattern = /^(NAT|JUR)-\d{10,13}$/;
    if (!pattern.test(value)) {
      throw new Error(
        `Código de proveedor inválido: "${value}". Formato esperado: {NAT|JUR}-{cédula/RUC}.`,
      );
    }
    return new SupplierCode(value);
  }

  public get value(): string {
    return this._value;
  }

  public equals(other: SupplierCode): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
