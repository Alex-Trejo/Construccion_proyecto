/**
 * @fileoverview Tipo de proveedor según su naturaleza jurídica.
 *
 * Este enum es clave para el Factory Method en el dominio de Supplier.
 * Determina qué tipo de entidad se instancia:
 *   - PERSONA_NATURAL  → PersonaNaturalSupplier
 *   - PERSONA_JURIDICA → PersonaJuridicaSupplier
 *
 * @module SupplierType
 */

export enum SupplierType {
  /** Proveedor persona natural (cédula, un solo titular). */
  PERSONA_NATURAL = 'PERSONA_NATURAL',

  /** Proveedor persona jurídica (RUC societario, razón social). */
  PERSONA_JURIDICA = 'PERSONA_JURIDICA',
}
