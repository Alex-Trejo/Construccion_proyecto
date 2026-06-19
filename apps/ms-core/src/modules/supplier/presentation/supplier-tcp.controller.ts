/**
 * @fileoverview Controller TCP — Proveedores (CRUD con aislamiento por dueño).
 *
 * Cada operación toma el `ownerId` de `payload.metadata.userId` (el sub del
 * JWT propagado por el gateway) para garantizar que un usuario solo vea/edite
 * sus propios proveedores.
 *
 * @module SupplierTcpController
 */

import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import {
  SUPPLIER_PATTERNS,
  SupplierType,
  type ICreateSupplierDto,
  type IUpdateSupplierDto,
  type ISupplier,
  type TcpPayload,
} from '@sgc/shared';

import { Supplier } from '../domain/entities/supplier.entity';
import { PersonaNaturalSupplier } from '../domain/entities/persona-natural-supplier.entity';
import { PersonaJuridicaSupplier } from '../domain/entities/persona-juridica-supplier.entity';
import { CreateSupplierUseCase } from '../application/use-cases/create-supplier.use-case';
import { FindAllSuppliersUseCase } from '../application/use-cases/find-all-suppliers.use-case';
import { FindSupplierByIdUseCase } from '../application/use-cases/find-supplier-by-id.use-case';
import { UpdateSupplierUseCase } from '../application/use-cases/update-supplier.use-case';
import { DeleteSupplierUseCase } from '../application/use-cases/delete-supplier.use-case';

@Controller()
export class SupplierTcpController {
  private readonly logger = new Logger(SupplierTcpController.name);

  constructor(
    private readonly createSupplierUseCase: CreateSupplierUseCase,
    private readonly findAllSuppliersUseCase: FindAllSuppliersUseCase,
    private readonly findByIdUseCase: FindSupplierByIdUseCase,
    private readonly updateSupplierUseCase: UpdateSupplierUseCase,
    private readonly deleteSupplierUseCase: DeleteSupplierUseCase,
  ) {}

  @MessagePattern(SUPPLIER_PATTERNS.CREATE)
  async create(payload: TcpPayload<ICreateSupplierDto>): Promise<ISupplier> {
    const ownerId = payload.metadata.userId;
    this.logger.debug(`TCP CREATE supplier (${payload.data.taxId}) owner=${ownerId}`);
    const supplier = await this.createSupplierUseCase.execute(payload.data, ownerId);
    return this.toISupplier(supplier);
  }

  @MessagePattern(SUPPLIER_PATTERNS.FIND_ALL)
  async findAll(
    payload: TcpPayload<Record<string, never>>,
  ): Promise<ReadonlyArray<ISupplier>> {
    const ownerId = payload.metadata.userId;
    this.logger.debug(`TCP FIND_ALL suppliers owner=${ownerId}`);
    const suppliers = await this.findAllSuppliersUseCase.execute(ownerId);
    return suppliers.map((s) => this.toISupplier(s));
  }

  @MessagePattern(SUPPLIER_PATTERNS.FIND_BY_ID)
  async findById(payload: TcpPayload<{ id: string }>): Promise<ISupplier> {
    const ownerId = payload.metadata.userId;
    const supplier = await this.findByIdUseCase.execute(payload.data.id, ownerId);
    return this.toISupplier(supplier);
  }

  @MessagePattern(SUPPLIER_PATTERNS.UPDATE)
  async update(
    payload: TcpPayload<{ id: string; changes: IUpdateSupplierDto }>,
  ): Promise<ISupplier> {
    const ownerId = payload.metadata.userId;
    const supplier = await this.updateSupplierUseCase.execute(
      payload.data.id,
      ownerId,
      payload.data.changes,
    );
    return this.toISupplier(supplier);
  }

  @MessagePattern(SUPPLIER_PATTERNS.DEACTIVATE)
  async deactivate(
    payload: TcpPayload<{ id: string }>,
  ): Promise<{ deleted: string }> {
    const ownerId = payload.metadata.userId;
    return this.deleteSupplierUseCase.execute(payload.data.id, ownerId);
  }

  /** Mapea la entidad de dominio al DTO de transporte ISupplier. */
  private toISupplier(supplier: Supplier): ISupplier {
    const base = {
      id: supplier.id,
      supplierCode: supplier.supplierCode.value,
      taxId: supplier.ruc.value,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };

    if (supplier instanceof PersonaNaturalSupplier) {
      return {
        ...base,
        supplierType: SupplierType.PERSONA_NATURAL,
        firstName: supplier.firstName,
        lastName: supplier.lastName,
        cedula: supplier.cedula,
      };
    }

    const juridica = supplier as PersonaJuridicaSupplier;
    return {
      ...base,
      supplierType: SupplierType.PERSONA_JURIDICA,
      businessName: juridica.businessName,
      tradeName: juridica.tradeName,
      legalRepresentative: juridica.legalRepresentative,
    };
  }
}
