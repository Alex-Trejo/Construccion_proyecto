/**
 * @fileoverview Módulo de Proveedores (ms-core).
 *
 * Clean Architecture:
 *   - Domain: entidades (jerarquía), VOs (Ruc, SupplierCode), Factory, puerto.
 *   - Application: casos de uso (crear, listar).
 *   - Infrastructure: TypeOrmSupplierRepository (adapter del puerto).
 *   - Presentation: SupplierTcpController (@MessagePattern).
 *
 * Exporta SUPPLIER_REPOSITORY_PORT para que DocumentModule pueda
 * auto-provisionar proveedores desde los XML recibidos.
 *
 * @module SupplierModule
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SUPPLIER_REPOSITORY_PORT } from './domain/ports/supplier-repository.port';
import { SupplierOrmEntity } from './infrastructure/persistence/supplier.orm-entity';
import { TypeOrmSupplierRepository } from './infrastructure/persistence/typeorm-supplier.repository';
import { CreateSupplierUseCase } from './application/use-cases/create-supplier.use-case';
import { FindAllSuppliersUseCase } from './application/use-cases/find-all-suppliers.use-case';
import { FindSupplierByIdUseCase } from './application/use-cases/find-supplier-by-id.use-case';
import { UpdateSupplierUseCase } from './application/use-cases/update-supplier.use-case';
import { DeleteSupplierUseCase } from './application/use-cases/delete-supplier.use-case';
import { SupplierTcpController } from './presentation/supplier-tcp.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SupplierOrmEntity])],
  controllers: [SupplierTcpController],
  providers: [
    {
      provide: SUPPLIER_REPOSITORY_PORT,
      useClass: TypeOrmSupplierRepository,
    },
    CreateSupplierUseCase,
    FindAllSuppliersUseCase,
    FindSupplierByIdUseCase,
    UpdateSupplierUseCase,
    DeleteSupplierUseCase,
  ],
  exports: [SUPPLIER_REPOSITORY_PORT],
})
export class SupplierModule {}
