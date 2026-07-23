/**
 * @fileoverview Caso de uso — Actualizar proveedor (con aislamiento).
 *
 * Reconstruye la entidad concreta con los campos modificados (las entidades
 * de dominio son inmutables). No cambia tipo, RUC ni código.
 *
 * @module UpdateSupplierUseCase
 */

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SupplierType, type IUpdateSupplierDto } from '@sgc/shared';

import { Supplier } from '../../../domain/entities/supplier.entity';
import { PersonaNaturalSupplier } from '../../../domain/entities/persona-natural-supplier.entity';
import { PersonaJuridicaSupplier } from '../../../domain/entities/persona-juridica-supplier.entity';
import {
  type SupplierRepositoryPort,
  SUPPLIER_REPOSITORY_PORT,
} from '../../../domain/ports/supplier-repository.port';

@Injectable()
export class UpdateSupplierUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY_PORT)
    private readonly supplierRepo: SupplierRepositoryPort,
  ) {}

  async execute(
    id: string,
    ownerId: string | null,
    dto: IUpdateSupplierDto,
  ): Promise<Supplier> {
    const existing = await this.supplierRepo.findById(id, ownerId);
    if (!existing) {
      throw new NotFoundException(`Proveedor ${id} no encontrado.`);
    }

    const base = {
      id: existing.id,
      ownerId: existing.ownerId,
      supplierCode: existing.supplierCode,
      ruc: existing.ruc,
      email: dto.email ?? existing.email,
      phone: dto.phone ?? existing.phone,
      address: dto.address ?? existing.address,
      isActive: existing.isActive,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    let updated: Supplier;
    if (existing instanceof PersonaNaturalSupplier) {
      updated = new PersonaNaturalSupplier({
        ...base,
        supplierType: SupplierType.PERSONA_NATURAL,
        firstName: dto.firstName ?? existing.firstName,
        lastName: dto.lastName ?? existing.lastName,
        cedula: existing.cedula,
      });
    } else {
      const juridica = existing as PersonaJuridicaSupplier;
      updated = new PersonaJuridicaSupplier({
        ...base,
        supplierType: SupplierType.PERSONA_JURIDICA,
        businessName: dto.businessName ?? juridica.businessName,
        tradeName: dto.tradeName ?? juridica.tradeName,
        legalRepresentative:
          dto.legalRepresentative ?? juridica.legalRepresentative,
      });
    }

    return this.supplierRepo.update(updated);
  }
}
