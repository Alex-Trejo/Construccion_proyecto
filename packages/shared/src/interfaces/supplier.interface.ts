/**
 * @fileoverview Interfaces de dominio para el módulo de Proveedores.
 *
 * Jerarquía de herencia (soporta Factory Method):
 *   IBaseSupplier (props comunes)
 *       ├── IPersonaNaturalSupplier (cédula, nombre completo)
 *       └── IPersonaJuridicaSupplier (RUC societario, razón social, rep. legal)
 *
 * ISupplier = Tipo unión discriminado por `supplierType`.
 *
 * @module SupplierInterfaces
 */

import { SupplierType } from '../enums/supplier-type.enum';

/**
 * Propiedades base compartidas por todo tipo de proveedor.
 * El campo `supplierType` actúa como discriminador para el Factory Method.
 */
export interface IBaseSupplier {
  /** UUID v4 del proveedor. */
  readonly id: string;

  /** Código dinámico generado por el sistema (ej: PROV-PN-000001). */
  readonly supplierCode: string;

  /** Tipo de proveedor — discriminador del Factory Method. */
  readonly supplierType: SupplierType;

  /** RUC o Cédula del proveedor (13 o 10 dígitos). */
  readonly taxId: string;

  /** Correo electrónico de contacto. */
  readonly email: string;

  /** Teléfono de contacto. */
  readonly phone: string;

  /** Dirección fiscal. */
  readonly address: string;

  /** Indica si el proveedor está activo en el sistema. */
  readonly isActive: boolean;

  /** Fecha de registro en el sistema. */
  readonly createdAt: Date;

  /** Fecha de última actualización. */
  readonly updatedAt: Date;
}

/**
 * Proveedor Persona Natural.
 * Extiende la base con nombre y apellido del titular.
 */
export interface IPersonaNaturalSupplier extends IBaseSupplier {
  readonly supplierType: SupplierType.PERSONA_NATURAL;

  /** Nombres del titular. */
  readonly firstName: string;

  /** Apellidos del titular. */
  readonly lastName: string;

  /** Cédula de identidad (10 dígitos). */
  readonly cedula: string;
}

/**
 * Proveedor Persona Jurídica.
 * Extiende la base con razón social y datos del representante legal.
 */
export interface IPersonaJuridicaSupplier extends IBaseSupplier {
  readonly supplierType: SupplierType.PERSONA_JURIDICA;

  /** Razón social de la empresa. */
  readonly businessName: string;

  /** Nombre comercial (puede diferir de la razón social). */
  readonly tradeName: string;

  /** Nombre completo del representante legal. */
  readonly legalRepresentative: string;
}

/**
 * Tipo unión discriminado (Discriminated Union).
 * Usa `supplierType` como discriminador para type narrowing en TypeScript.
 *
 * Ejemplo:
 * ```ts
 * function handle(supplier: ISupplier): void {
 *   if (supplier.supplierType === SupplierType.PERSONA_NATURAL) {
 *     console.log(supplier.firstName); // TS sabe que es PersonaNatural
 *   }
 * }
 * ```
 */
export type ISupplier = IPersonaNaturalSupplier | IPersonaJuridicaSupplier;
