/**
 * @fileoverview Adaptador TypeORM — Repositorio de Proveedores.
 *
 * Implementa SupplierRepositoryPort con AISLAMIENTO por dueño (owner_id):
 * todas las consultas filtran por el userId del solicitante. Mapea entre la
 * jerarquía de dominio (PersonaNatural/PersonaJuridica + VOs) y el schema plano.
 *
 * @module TypeOrmSupplierRepository
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository, type FindOptionsWhere } from 'typeorm';
import { SupplierType } from '@sgc/shared';

import { type SupplierRepositoryPort } from '../../domain/ports/supplier-repository.port';
import { Supplier } from '../../domain/entities/supplier.entity';
import { PersonaNaturalSupplier } from '../../domain/entities/persona-natural-supplier.entity';
import { PersonaJuridicaSupplier } from '../../domain/entities/persona-juridica-supplier.entity';
import { Ruc } from '../../domain/value-objects/ruc.vo';
import { SupplierCode } from '../../domain/value-objects/supplier-code.vo';
import { SupplierOrmEntity } from './supplier.orm-entity';

@Injectable()
export class TypeOrmSupplierRepository implements SupplierRepositoryPort {
  private readonly logger = new Logger(TypeOrmSupplierRepository.name);

  constructor(
    @InjectRepository(SupplierOrmEntity)
    private readonly repository: Repository<SupplierOrmEntity>,
  ) {}

  /** Predicado de dueño (maneja null = registros del sistema). */
  private owner(ownerId: string | null): string | ReturnType<typeof IsNull> {
    return ownerId === null ? IsNull() : ownerId;
  }

  async save(supplier: Supplier): Promise<Supplier> {
    const saved = await this.repository.save(this.toSchema(supplier));
    this.logger.debug(`Proveedor guardado: ${saved.id} (${saved.ruc})`);
    return this.toDomain(saved);
  }

  async findById(id: string, ownerId: string | null): Promise<Supplier | null> {
    const schema = await this.repository.findOne({
      where: { id, ownerId: this.owner(ownerId) } as FindOptionsWhere<SupplierOrmEntity>,
    });
    return schema ? this.toDomain(schema) : null;
  }

  async findByTaxId(
    taxId: string,
    ownerId: string | null,
  ): Promise<Supplier | null> {
    const schema = await this.repository.findOne({
      where: { ruc: taxId, ownerId: this.owner(ownerId) } as FindOptionsWhere<SupplierOrmEntity>,
    });
    return schema ? this.toDomain(schema) : null;
  }

  async findAll(ownerId: string | null): Promise<ReadonlyArray<Supplier>> {
    const schemas = await this.repository.find({
      where: {
        isActive: true,
        ownerId: this.owner(ownerId),
      } as FindOptionsWhere<SupplierOrmEntity>,
      order: { createdAt: 'DESC' },
    });
    return schemas.map((s) => this.toDomain(s));
  }

  async findPaginated(
    page: number,
    limit: number,
    ownerId: string | null,
  ): Promise<[ReadonlyArray<Supplier>, number]> {
    const [schemas, total] = await this.repository.findAndCount({
      where: { ownerId: this.owner(ownerId) } as FindOptionsWhere<SupplierOrmEntity>,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return [schemas.map((s) => this.toDomain(s)), total];
  }

  async update(supplier: Supplier): Promise<Supplier> {
    const saved = await this.repository.save(this.toSchema(supplier));
    return this.toDomain(saved);
  }

  async deactivate(id: string, ownerId: string | null): Promise<void> {
    await this.repository.update(
      { id, ownerId: this.owner(ownerId) } as FindOptionsWhere<SupplierOrmEntity>,
      { isActive: false },
    );
    this.logger.debug(`Proveedor desactivado: ${id}`);
  }

  async existsByTaxId(taxId: string, ownerId: string | null): Promise<boolean> {
    const count = await this.repository.count({
      where: { ruc: taxId, ownerId: this.owner(ownerId) } as FindOptionsWhere<SupplierOrmEntity>,
    });
    return count > 0;
  }

  // ── Mappers: Domain ↔ Schema ─────────────────────────────────────────────

  private toSchema(domain: Supplier): SupplierOrmEntity {
    const schema = new SupplierOrmEntity();
    schema.id = domain.id;
    schema.ownerId = domain.ownerId;
    schema.supplierCode = domain.supplierCode.value;
    schema.supplierType = domain.supplierType;
    schema.ruc = domain.ruc.value;
    schema.email = domain.email || null;
    schema.phone = domain.phone || null;
    schema.address = domain.address || null;
    schema.isActive = domain.isActive;
    schema.createdAt = domain.createdAt;
    schema.updatedAt = domain.updatedAt;

    schema.obligadoContabilidad = false;
    schema.regimen = null;

    if (domain instanceof PersonaNaturalSupplier) {
      schema.firstName = domain.firstName;
      schema.lastName = domain.lastName;
      schema.cedula = domain.cedula;
      schema.razonSocial = domain.getDisplayName();
      schema.nombreComercial = null;
      schema.legalRepresentative = null;
    } else if (domain instanceof PersonaJuridicaSupplier) {
      schema.razonSocial = domain.businessName;
      schema.nombreComercial = domain.tradeName;
      schema.legalRepresentative = domain.legalRepresentative;
      schema.firstName = null;
      schema.lastName = null;
      schema.cedula = null;
    } else {
      schema.razonSocial = domain.getDisplayName();
    }

    return schema;
  }

  private toDomain(schema: SupplierOrmEntity): Supplier {
    const base = {
      id: schema.id,
      ownerId: schema.ownerId,
      supplierCode: SupplierCode.fromExisting(schema.supplierCode),
      ruc: Ruc.create(schema.ruc),
      email: schema.email ?? '',
      phone: schema.phone ?? '',
      address: schema.address ?? '',
      isActive: schema.isActive,
      createdAt: schema.createdAt,
      updatedAt: schema.updatedAt,
    };

    if (schema.supplierType === SupplierType.PERSONA_NATURAL) {
      return new PersonaNaturalSupplier({
        ...base,
        supplierType: SupplierType.PERSONA_NATURAL,
        firstName: schema.firstName ?? '',
        lastName: schema.lastName ?? '',
        cedula: schema.cedula ?? '',
      });
    }

    return new PersonaJuridicaSupplier({
      ...base,
      supplierType: SupplierType.PERSONA_JURIDICA,
      businessName: schema.razonSocial,
      tradeName: schema.nombreComercial ?? schema.razonSocial,
      legalRepresentative: schema.legalRepresentative ?? '',
    });
  }
}
