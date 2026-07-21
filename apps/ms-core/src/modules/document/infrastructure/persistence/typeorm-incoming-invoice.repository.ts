/**
 * @fileoverview Adaptador TypeORM — Repositorio de IncomingInvoice (staging).
 *
 * Implementa IncomingInvoiceRepositoryPort usando TypeORM Repository.
 * Mapea entre la entidad de dominio IncomingInvoice y el schema
 * `incoming_invoices` (cola de trabajo de comprobantes del SRI).
 *
 * @module TypeOrmIncomingInvoiceRepository
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { InvoiceOrigin, InvoiceProcessingStatus } from '@sgc/shared';

import { type IncomingInvoiceRepositoryPort } from '../../domain/ports/incoming-invoice-repository.port';
import { IncomingInvoice } from '../../domain/entities/incoming-invoice.entity';
import { IncomingInvoiceOrmEntity } from './incoming-invoice.orm-entity';

@Injectable()
export class TypeOrmIncomingInvoiceRepository
  implements IncomingInvoiceRepositoryPort
{
  private readonly logger = new Logger(TypeOrmIncomingInvoiceRepository.name);

  constructor(
    @InjectRepository(IncomingInvoiceOrmEntity)
    private readonly repository: Repository<IncomingInvoiceOrmEntity>,
  ) {}

  async save(invoice: IncomingInvoice): Promise<IncomingInvoice> {
    const saved = await this.repository.save(this.toSchema(invoice));
    this.logger.debug(`Factura staging guardada: ${saved.claveAcceso}`);
    return this.toDomain(saved);
  }

  async saveBatch(invoices: ReadonlyArray<IncomingInvoice>): Promise<void> {
    if (invoices.length === 0) return;
    const schemas = invoices.map((i) => this.toSchema(i));
    await this.repository.save(schemas);
    this.logger.debug(`Lote de ${schemas.length} facturas staging guardado.`);
  }

  async findById(id: string): Promise<IncomingInvoice | null> {
    const schema = await this.repository.findOne({ where: { id } });
    return schema ? this.toDomain(schema) : null;
  }

  async findByClaveAcceso(claveAcceso: string): Promise<IncomingInvoice | null> {
    const schema = await this.repository.findOne({ where: { claveAcceso } });
    return schema ? this.toDomain(schema) : null;
  }

  async findByEstado(
    estado: InvoiceProcessingStatus,
  ): Promise<ReadonlyArray<IncomingInvoice>> {
    const schemas = await this.repository.find({
      where: { estado },
      order: { createdAt: 'ASC' },
    });
    return schemas.map((s) => this.toDomain(s));
  }

  async findByOwnerAndEstado(
    ownerId: string | null,
    estado: InvoiceProcessingStatus,
  ): Promise<ReadonlyArray<IncomingInvoice>> {
    const schemas = await this.repository.find({
      where: { ownerId: ownerId === null ? IsNull() : ownerId, estado },
      order: { updatedAt: 'DESC' },
    });
    return schemas.map((s) => this.toDomain(s));
  }

  async update(invoice: IncomingInvoice): Promise<IncomingInvoice> {
    const saved = await this.repository.save(this.toSchema(invoice));
    return this.toDomain(saved);
  }

  async existsByClaveAcceso(claveAcceso: string): Promise<boolean> {
    const count = await this.repository.count({ where: { claveAcceso } });
    return count > 0;
  }

  // ── Mappers: Domain ↔ Schema ─────────────────────────────────────────────

  private toSchema(domain: IncomingInvoice): IncomingInvoiceOrmEntity {
    const schema = new IncomingInvoiceOrmEntity();
    schema.id = domain.id;
    schema.claveAcceso = domain.claveAcceso;
    schema.estado = domain.estado;
    schema.origen = domain.origen;
    schema.xmlCrudo = domain.xmlCrudo;
    schema.xmlLimpio = domain.xmlLimpio;
    schema.errorMessage = domain.errorMessage;
    schema.intentos = domain.intentos;
    schema.ownerId = domain.ownerId;
    schema.createdAt = domain.createdAt;
    schema.updatedAt = domain.updatedAt;
    return schema;
  }

  private toDomain(schema: IncomingInvoiceOrmEntity): IncomingInvoice {
    return new IncomingInvoice({
      id: schema.id,
      claveAcceso: schema.claveAcceso,
      estado: schema.estado as InvoiceProcessingStatus,
      origen: schema.origen as InvoiceOrigin,
      xmlCrudo: schema.xmlCrudo,
      xmlLimpio: schema.xmlLimpio,
      errorMessage: schema.errorMessage,
      intentos: schema.intentos,
      ownerId: schema.ownerId,
      createdAt: schema.createdAt,
      updatedAt: schema.updatedAt,
    });
  }
}
