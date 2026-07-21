/**
 * @fileoverview DTO para actualizar un proveedor (campos parciales).
 *
 * No se permite cambiar el tipo, el RUC ni el código (identidad del registro).
 *
 * @module update-supplier.dto
 */

export interface IUpdateSupplierDto {
  readonly email?: string;
  readonly phone?: string;
  readonly address?: string;
  // Persona Natural
  readonly firstName?: string;
  readonly lastName?: string;
  // Persona Jurídica
  readonly businessName?: string;
  readonly tradeName?: string;
  readonly legalRepresentative?: string;
}
