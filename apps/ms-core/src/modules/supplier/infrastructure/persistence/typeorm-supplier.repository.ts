/**
 * @fileoverview Adaptador TypeORM — Repositorio de Proveedores.
 *
 * Implementa SupplierRepositoryPort usando TypeORM Repository.
 * Mapea entre la jerarquía de dominio (PersonaNatural/PersonaJuridica
 * + Value Objects Ruc/SupplierCode) y el schema plano `suppliers`.
 *
 * @module TypeOrmSupplierRepository
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async save(supplier: Supplier): Promise<Supplier> {
    const schema = this.toSchema(supplier);
    const saved = await this.repository.save(schema);
    this.logger.debug(`Proveedor guardado: ${saved.id} (${saved.ruc})`);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Supplier | null> {
    const schema = await this.repository.findOne({ where: { id } });
    return schema ? this.toDomain(schema) : null;
  }

  async findByTaxId(taxId: string): Promise<Supplier | null> {
    const schema = await this.repository.findOne({ where: { ruc: taxId } });
    return schema ? this.toDomain(schema) : null;
  }

  async findAll(): Promise<ReadonlyArray<Supplier>> {
    const schemas = await this.repository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
    return schemas.map((s) => this.toDomain(s));
  }

  async findPaginated(
    page: number,
    limit: number,
  ): Promise<[ReadonlyArray<Supplier>, number]> {
    const [schemas, total] = await this.repository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return [schemas.map((s) => this.toDomain(s)), total];
  }

  async update(supplier: Supplier): Promise<Supplier> {
    const schema = this.toSchema(supplier);
    const saved = await this.repository.save(schema);
    return this.toDomain(saved);
  }

  async deactivate(id: string): Promise<void> {
    await this.repository.update({ id }, { isActive: false });
    this.logger.debug(`Proveedor desactivado: ${id}`);
  }

  async existsByTaxId(taxId: string): Promise<boolean> {
    const count = await this.repository.count({ where: { ruc: taxId } });
    return count > 0;
  }

  // ── Mappers: Domain ↔ Schema ─────────────────────────────────────────────

  private toSchema(domain: Supplier): SupplierOrmEntity {
    const schema = new SupplierOrmEntity();
    schema.id = domain.id;
    schema.supplierCode = domain.supplierCode.value;
    schema.supplierType = domain.supplierType;
    schema.ruc = domain.ruc.value;
    schema.email = domain.email || null;
    schema.phone = domain.phone || null;
    schema.address = domain.address || null;
    schema.isActive = domain.isActive;
    schema.createdAt = domain.createdAt;
    schema.updatedAt = domain.updatedAt;

    // Campos por defecto (no provistos por el dominio Supplier).
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
      // Fallback defensivo: el dominio siempre es una de las dos subclases.
      schema.razonSocial = domain.getDisplayName();
    }

    return schema;
  }

  private toDomain(schema: SupplierOrmEntity): Supplier {
    const base = {
      id: schema.id,
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
