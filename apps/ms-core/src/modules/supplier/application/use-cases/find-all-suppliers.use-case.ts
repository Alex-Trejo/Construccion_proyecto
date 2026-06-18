/**
 * @fileoverview Caso de uso — Listar todos los Proveedores activos.
 *
 * @module FindAllSuppliersUseCase
 */

import { Inject, Injectable } from '@nestjs/common';

import { Supplier } from '../../domain/entities/supplier.entity';
import {
  type SupplierRepositoryPort,
  SUPPLIER_REPOSITORY_PORT,
} from '../../domain/ports/supplier-repository.port';

@Injectable()
export class FindAllSuppliersUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY_PORT)
    private readonly supplierRepo: SupplierRepositoryPort,
  ) {}

  async execute(): Promise<ReadonlyArray<Supplier>> {
    return this.supplierRepo.findAll();
  }
}
