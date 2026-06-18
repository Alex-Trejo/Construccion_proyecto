/**
 * @fileoverview DTOs para la creación de proveedores.
 *
 * Estos DTOs se comparten entre frontend (formularios) y backend (validación).
 * La validación de clase (class-validator) se aplica en la capa de Presentation
 * de cada microservicio, no aquí.
 *
 * @module CreateSupplierDto
 */

import { SupplierType } from '../enums/supplier-type.enum';

/**
 * Campos comunes para crear cualquier tipo de proveedor.
 */
export interface ICreateSupplierBaseDto {
  readonly supplierType: SupplierType;
  readonly taxId: string;
  readonly email: string;
  readonly phone: string;
  readonly address: string;
}

/**
 * DTO para crear un proveedor Persona Natural.
 */
export interface ICreatePersonaNaturalDto extends ICreateSupplierBaseDto {
  readonly supplierType: SupplierType.PERSONA_NATURAL;
  readonly firstName: string;
  readonly lastName: string;
  readonly cedula: string;
}

/**
 * DTO para crear un proveedor Persona Jurídica.
 */
export interface ICreatePersonaJuridicaDto extends ICreateSupplierBaseDto {
  readonly supplierType: SupplierType.PERSONA_JURIDICA;
  readonly businessName: string;
  readonly tradeName: string;
  readonly legalRepresentative: string;
}

/**
 * Tipo unión discriminado para la creación de proveedores.
 * El Factory Method en ms-core usará este tipo para decidir
 * qué entidad concreta instanciar.
 */
export type ICreateSupplierDto =
  | ICreatePersonaNaturalDto
  | ICreatePersonaJuridicaDto;
