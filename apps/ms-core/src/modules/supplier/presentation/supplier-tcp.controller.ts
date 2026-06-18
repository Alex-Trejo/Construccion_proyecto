/**
 * @fileoverview Controller TCP — Proveedores.
 *
 * Recibe mensajes TCP del api-gateway para crear y listar proveedores.
 * Mapea la jerarquía de dominio (PersonaNatural/PersonaJuridica) al
 * tipo unión discriminado `ISupplier` de @sgc/shared para el transporte.
 *
 * @module SupplierTcpController
 */

import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import {
  SUPPLIER_PATTERNS,
  SupplierType,
  type ICreateSupplierDto,
  type ISupplier,
  type TcpPayload,
} from '@sgc/shared';

import { Supplier } from '../domain/entities/supplier.entity';
import { PersonaNaturalSupplier } from '../domain/entities/persona-natural-supplier.entity';
import { PersonaJuridicaSupplier } from '../domain/entities/persona-juridica-supplier.entity';
import { CreateSupplierUseCase } from '../application/use-cases/create-supplier.use-case';
import { FindAllSuppliersUseCase } from '../application/use-cases/find-all-suppliers.use-case';

@Controller()
export class SupplierTcpController {
  private readonly logger = new Logger(SupplierTcpController.name);

  constructor(
    private readonly createSupplierUseCase: CreateSupplierUseCase,
    private readonly findAllSuppliersUseCase: FindAllSuppliersUseCase,
  ) {}

  @MessagePattern(SUPPLIER_PATTERNS.CREATE)
  async create(payload: TcpPayload<ICreateSupplierDto>): Promise<ISupplier> {
    this.logger.debug(`TCP: SUPPLIER_CREATE (${payload.data.taxId})`);
    const supplier = await this.createSupplierUseCase.execute(payload.data);
    return this.toISupplier(supplier);
  }

  @MessagePattern(SUPPLIER_PATTERNS.FIND_ALL)
  async findAll(): Promise<ReadonlyArray<ISupplier>> {
    this.logger.debug('TCP: SUPPLIER_FIND_ALL');
    const suppliers = await this.findAllSuppliersUseCase.execute();
    return suppliers.map((s) => this.toISupplier(s));
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
