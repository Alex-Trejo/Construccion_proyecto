/**
 * @fileoverview Controller TCP — Proveedores (CRUD con aislamiento por dueño).
 *
 * Cada operación toma el `ownerId` de `payload.metadata.userId` (el sub del
 * JWT propagado por el gateway) para garantizar que un usuario solo vea/edite
 * sus propios proveedores.
 *
 * @module SupplierTcpController
 */

import { Controller, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import {
  SUPPLIER_PATTERNS,
  SupplierType,
  type ICreateSupplierDto,
  type IUpdateSupplierDto,
  type ISupplier,
  type TcpPayload,
} from '@sgc/shared';

import { Supplier } from '../domain/entities/supplier.entity';
import { DomainValidationError } from '../domain/errors/domain-validation.error';
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
    return this.guard(async () => {
      const ownerId = payload.metadata.userId;
      this.logger.debug(
        `TCP CREATE supplier (${payload.data.taxId}) owner=${ownerId}`,
      );
      const supplier = await this.createSupplierUseCase.execute(
        payload.data,
        ownerId,
      );
      return this.toISupplier(supplier);
    });
  }

  @MessagePattern(SUPPLIER_PATTERNS.FIND_ALL)
  async findAll(
    payload: TcpPayload<Record<string, never>>,
  ): Promise<ReadonlyArray<ISupplier>> {
    return this.guard(async () => {
      const ownerId = payload.metadata.userId;
      this.logger.debug(`TCP FIND_ALL suppliers owner=${ownerId}`);
      const suppliers = await this.findAllSuppliersUseCase.execute(ownerId);
      return suppliers.map((s) => this.toISupplier(s));
    });
  }

  @MessagePattern(SUPPLIER_PATTERNS.FIND_BY_ID)
  async findById(payload: TcpPayload<{ id: string }>): Promise<ISupplier> {
    return this.guard(async () => {
      const ownerId = payload.metadata.userId;
      const supplier = await this.findByIdUseCase.execute(
        payload.data.id,
        ownerId,
      );
      return this.toISupplier(supplier);
    });
  }

  @MessagePattern(SUPPLIER_PATTERNS.UPDATE)
  async update(
    payload: TcpPayload<{ id: string; changes: IUpdateSupplierDto }>,
  ): Promise<ISupplier> {
    return this.guard(async () => {
      const ownerId = payload.metadata.userId;
      const supplier = await this.updateSupplierUseCase.execute(
        payload.data.id,
        ownerId,
        payload.data.changes,
      );
      return this.toISupplier(supplier);
    });
  }

  @MessagePattern(SUPPLIER_PATTERNS.DEACTIVATE)
  async deactivate(
    payload: TcpPayload<{ id: string }>,
  ): Promise<{ deleted: string }> {
    return this.guard(() => {
      const ownerId = payload.metadata.userId;
      return this.deleteSupplierUseCase.execute(payload.data.id, ownerId);
    });
  }

  /**
   * Ejecuta la lógica del handler y traduce cualquier excepción a un
   * `RpcException` con forma `{ statusCode, message }`, de modo que el mensaje
   * y el código HTTP sobrevivan la serialización TCP y el gateway pueda
   * presentar un error claro al usuario (en lugar de "Internal server error").
   */
  private async guard<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      throw this.toRpcException(err);
    }
  }

  /** Mapea un error de dominio/aplicación a un RpcException con status + mensaje. */
  private toRpcException(err: unknown): RpcException {
    // Errores de validación de negocio → 400 Bad Request con mensaje claro.
    if (err instanceof DomainValidationError) {
      return new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: err.message,
      });
    }

    // Excepciones HTTP de Nest (ConflictException, NotFoundException, …).
    if (err instanceof HttpException) {
      return new RpcException({
        statusCode: err.getStatus(),
        message: err.message,
      });
    }

    // Errores inesperados (infraestructura, BD, …) → 500 sin filtrar detalles.
    const message = err instanceof Error ? err.message : 'Error desconocido';
    this.logger.error(`Error inesperado en supplier: ${message}`);
    return new RpcException({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor al procesar el proveedor.',
    });
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
