/**
 * @fileoverview Caso de uso — Eliminar (desactivar) proveedor con aislamiento.
 * @module DeleteSupplierUseCase
 */

import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import {
  type SupplierRepositoryPort,
  SUPPLIER_REPOSITORY_PORT,
} from '../../../domain/ports/supplier-repository.port';

@Injectable()
export class DeleteSupplierUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY_PORT)
    private readonly supplierRepo: SupplierRepositoryPort,
  ) {}

  async execute(id: string, ownerId: string | null): Promise<{ deleted: string }> {
    const existing = await this.supplierRepo.findById(id, ownerId);
    if (!existing) {
      throw new NotFoundException(`Proveedor ${id} no encontrado.`);
    }
    await this.supplierRepo.deactivate(id, ownerId);
    return { deleted: id };
  }
}
