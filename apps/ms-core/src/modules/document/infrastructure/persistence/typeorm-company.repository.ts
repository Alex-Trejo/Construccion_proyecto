/**
 * @fileoverview Adaptador TypeORM — Repositorio de Company (Empresa Receptora).
 *
 * Implementa CompanyRepositoryPort mapeando la entidad de dominio Company
 * (con VO Ruc y enum TaxRegime) al schema plano `companies`.
 *
 * @module TypeOrmCompanyRepository
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxRegime } from '@sgc/shared';

import { type CompanyRepositoryPort } from '../../domain/ports/company-repository.port';
import { Company } from '../../domain/entities/company.entity';
import { Ruc } from '../../../supplier/domain/value-objects/ruc.vo';
import { CompanyOrmEntity } from '../../../supplier/infrastructure/persistence/company.orm-entity';

@Injectable()
export class TypeOrmCompanyRepository implements CompanyRepositoryPort {
  private readonly logger = new Logger(TypeOrmCompanyRepository.name);

  constructor(
    @InjectRepository(CompanyOrmEntity)
    private readonly repository: Repository<CompanyOrmEntity>,
  ) {}

  async save(company: Company): Promise<Company> {
    const saved = await this.repository.save(this.toSchema(company));
    this.logger.debug(`Compañía guardada: ${saved.id} (${saved.ruc})`);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Company | null> {
    const schema = await this.repository.findOne({ where: { id } });
    return schema ? this.toDomain(schema) : null;
  }

  async findByTaxId(taxId: string): Promise<Company | null> {
    const schema = await this.repository.findOne({ where: { ruc: taxId } });
    return schema ? this.toDomain(schema) : null;
  }

  async existsByTaxId(taxId: string): Promise<boolean> {
    const count = await this.repository.count({ where: { ruc: taxId } });
    return count > 0;
  }

  // ── Mappers: Domain ↔ Schema ─────────────────────────────────────────────

  private toSchema(domain: Company): CompanyOrmEntity {
    const schema = new CompanyOrmEntity();
    schema.id = domain.id;
    schema.ruc = domain.ruc.value;
    schema.razonSocial = domain.razonSocial;
    schema.nombreComercial = domain.nombreComercial || null;
    schema.direccion = domain.direccion || null;
    schema.obligadoLlevarContabilidad = domain.obligadoLlevarContabilidad;
    schema.regimen = domain.regimen;
    schema.isActive = domain.isActive;
    schema.createdAt = domain.createdAt;
    schema.updatedAt = domain.updatedAt;
    return schema;
  }

  private toDomain(schema: CompanyOrmEntity): Company {
    return new Company({
      id: schema.id,
      ruc: Ruc.create(schema.ruc),
      razonSocial: schema.razonSocial,
      nombreComercial: schema.nombreComercial ?? '',
      direccion: schema.direccion ?? '',
      obligadoLlevarContabilidad: schema.obligadoLlevarContabilidad,
      regimen: schema.regimen as TaxRegime,
      isActive: schema.isActive,
      createdAt: schema.createdAt,
      updatedAt: schema.updatedAt,
    });
  }
}
