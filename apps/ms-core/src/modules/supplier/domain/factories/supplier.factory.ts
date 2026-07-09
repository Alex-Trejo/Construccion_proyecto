/**
 * @fileoverview Factory Method (GoF) — Creación dinámica de Proveedores.
 *
 * Patrón: Factory Method
 * ──────────────────────
 * Encapsula la lógica de instanciación de las entidades concretas
 * (PersonaNaturalSupplier, PersonaJuridicaSupplier) basándose en el
 * campo discriminador `supplierType` del DTO.
 *
 * Responsabilidades:
 *   1. Recibir el DTO de creación (ICreateSupplierDto, discriminated union).
 *   2. Generar automáticamente el SupplierCode dinámico.
 *   3. Validar y crear el Value Object Ruc.
 *   4. Instanciar la entidad concreta correspondiente.
 *
 * Principio OCP: Para agregar un nuevo tipo de proveedor, se crea una nueva
 * clase entidad y se agrega un case al switch — sin modificar las existentes.
 *
 * @module SupplierFactory
 */

import { randomUUID } from 'crypto';
import {
  SupplierType,
  type ICreateSupplierDto,
  type ICreatePersonaNaturalDto,
  type ICreatePersonaJuridicaDto,
} from '@sgc/shared';

import { Supplier } from '../entities/supplier.entity';
import { PersonaNaturalSupplier } from '../entities/persona-natural-supplier.entity';
import { PersonaJuridicaSupplier } from '../entities/persona-juridica-supplier.entity';
import { Ruc } from '../value-objects/ruc.vo';
import { SupplierCode } from '../value-objects/supplier-code.vo';

export class SupplierFactory {
  /**
   * Crea una entidad de dominio Supplier a partir de un DTO.
   *
   * @param dto - DTO de creación (discriminated union por supplierType).
   * @returns Instancia concreta de Supplier (PersonaNatural o PersonaJuridica).
   * @throws {Error} Si el supplierType no es reconocido.
   * @throws {Error} Si el RUC/Cédula no es válido.
   *
   * @example
   * ```ts
   * const supplier = SupplierFactory.create({
   *   supplierType: SupplierType.PERSONA_NATURAL,
   *   taxId: '1710034065',
   *   firstName: 'Juan',
   *   lastName: 'Pérez',
   *   cedula: '1710034065',
   *   email: 'juan@mail.com',
   *   phone: '0991234567',
   *   address: 'Quito, Ecuador',
   * });
   * // supplier.supplierCode.value → "PROV-NAT-2026-a1b2c3d4"
   * ```
   */
  public static create(
    dto: ICreateSupplierDto,
    ownerId: string | null,
  ): Supplier {
    const id = randomUUID();
    const ruc = Ruc.create(dto.taxId);
    SupplierFactory.validatePhone(dto.phone);
    // El código se deriva de los datos ingresados (tipo + RUC/Cédula).
    const supplierCode = SupplierCode.generate(dto.supplierType, ruc.value);
    const now = new Date();

    switch (dto.supplierType) {
      case SupplierType.PERSONA_NATURAL:
        return SupplierFactory.createPersonaNatural(
          id, ownerId, supplierCode, ruc, now, dto,
        );

      case SupplierType.PERSONA_JURIDICA:
        return SupplierFactory.createPersonaJuridica(
          id, ownerId, supplierCode, ruc, now, dto,
        );

      default: {
        // Exhaustive check: si se agrega un nuevo SupplierType al enum
        // y no se maneja aquí, TypeScript dará error en compilación.
        const exhaustiveCheck: never = dto;
        throw new Error(
          `Tipo de proveedor no soportado: ${JSON.stringify(exhaustiveCheck)}`,
        );
      }
    }
  }

  /**
   * Valida que el teléfono, si se proporciona, contenga solo dígitos
   * (7 a 10 dígitos). Campo opcional: se permite vacío.
   *
   * @throws {Error} Si el teléfono contiene caracteres no numéricos o
   *   una longitud fuera de rango.
   */
  private static validatePhone(phone: string | undefined): void {
    const sanitized = (phone ?? '').trim();
    if (sanitized === '') {
      return;
    }
    if (!/^\d{7,10}$/.test(sanitized)) {
      throw new Error(
        `Teléfono inválido: "${sanitized}". Debe contener solo números (7 a 10 dígitos).`,
      );
    }
  }

  private static createPersonaNatural(
    id: string,
    ownerId: string | null,
    supplierCode: SupplierCode,
    ruc: Ruc,
    now: Date,
    dto: ICreatePersonaNaturalDto,
  ): PersonaNaturalSupplier {
    // La cédula de una persona natural debe ser exactamente 10 dígitos.
    // Reutiliza la validación numérica + dígito verificador del VO Ruc.
    const cedulaVo = Ruc.create(dto.cedula);
    if (!cedulaVo.isCedula) {
      throw new Error(
        `Cédula inválida: "${dto.cedula}". Debe contener exactamente 10 dígitos numéricos.`,
      );
    }

    return new PersonaNaturalSupplier({
      id,
      ownerId,
      supplierCode,
      supplierType: SupplierType.PERSONA_NATURAL,
      ruc,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      firstName: dto.firstName,
      lastName: dto.lastName,
      cedula: dto.cedula,
    });
  }

  private static createPersonaJuridica(
    id: string,
    ownerId: string | null,
    supplierCode: SupplierCode,
    ruc: Ruc,
    now: Date,
    dto: ICreatePersonaJuridicaDto,
  ): PersonaJuridicaSupplier {
    return new PersonaJuridicaSupplier({
      id,
      ownerId,
      supplierCode,
      supplierType: SupplierType.PERSONA_JURIDICA,
      ruc,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      businessName: dto.businessName,
      tradeName: dto.tradeName,
      legalRepresentative: dto.legalRepresentative,
    });
  }
}
