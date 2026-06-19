/**
 * @fileoverview Caso de uso — Crear Proveedor.
 *
 * Usa el Factory Method (SupplierFactory) para instanciar la entidad
 * concreta según el tipo, valida deduplicación por RUC/Cédula y persiste.
 *
 * @module CreateSupplierUseCase
 */

import { Inject, Injectable, Logger, ConflictException } from '@nestjs/common';
import { type ICreateSupplierDto } from '@sgc/shared';

import { Supplier } from '../../domain/entities/supplier.entity';
import { SupplierFactory } from '../../domain/factories/supplier.factory';
import {
  type SupplierRepositoryPort,
  SUPPLIER_REPOSITORY_PORT,
} from '../../domain/ports/supplier-repository.port';

@Injectable()
export class CreateSupplierUseCase {
  private readonly logger = new Logger(CreateSupplierUseCase.name);

  constructor(
    @Inject(SUPPLIER_REPOSITORY_PORT)
    private readonly supplierRepo: SupplierRepositoryPort,
  ) {}

  async execute(
    dto: ICreateSupplierDto,
    ownerId: string | null,
  ): Promise<Supplier> {
    const exists = await this.supplierRepo.existsByTaxId(dto.taxId, ownerId);
    if (exists) {
      throw new ConflictException(
        `Ya existe un proveedor con RUC/Cédula ${dto.taxId}.`,
      );
    }

    // Factory Method: crea PersonaNatural o PersonaJuridica según el tipo.
    const supplier = SupplierFactory.create(dto, ownerId);
    const saved = await this.supplierRepo.save(supplier);

    this.logger.log(
      `Proveedor creado: ${saved.getDisplayName()} (${saved.ruc.value})`,
    );
    return saved;
  }
}
