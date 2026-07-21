/**
 * @fileoverview Caso de uso — Buscar proveedor por ID (con aislamiento).
 * @module FindSupplierByIdUseCase
 */

import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { Supplier } from '../../domain/entities/supplier.entity';
import {
  type SupplierRepositoryPort,
  SUPPLIER_REPOSITORY_PORT,
} from '../../domain/ports/supplier-repository.port';

@Injectable()
export class FindSupplierByIdUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY_PORT)
    private readonly supplierRepo: SupplierRepositoryPort,
  ) {}

  async execute(id: string, ownerId: string | null): Promise<Supplier> {
    const supplier = await this.supplierRepo.findById(id, ownerId);
    if (!supplier) {
      throw new NotFoundException(`Proveedor ${id} no encontrado.`);
    }
    return supplier;
  }
}
