/**
 * @fileoverview Adaptador TypeORM — Repositorio de Comprobantes (Document).
 *
 * Persiste el comprobante con sus items e impuestos (cascade) y aplica el
 * aislamiento por dueño en todas las consultas.
 *
 * @module TypeOrmDocumentRepository
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository, type FindOptionsWhere } from 'typeorm';
import {
  DocumentStatus,
  DocumentType,
  type ICreateDocumentDto,
  type IDocumentDto,
} from '@sgc/shared';

import { type DocumentRepositoryPort } from '../../domain/ports/document-repository.port';
import { DocumentOrmEntity } from './document.orm-entity';

@Injectable()
export class TypeOrmDocumentRepository implements DocumentRepositoryPort {
  private readonly bucket: string;

  constructor(
    @InjectRepository(DocumentOrmEntity)
    private readonly repo: Repository<DocumentOrmEntity>,
    config: ConfigService,
  ) {
    this.bucket = config.getOrThrow<string>('MINIO_BUCKET_NAME');
  }

  private owner(ownerId: string | null): string | ReturnType<typeof IsNull> {
    return ownerId === null ? IsNull() : ownerId;
  }

  async save(
    dto: ICreateDocumentDto,
    ownerId: string | null,
    source: string,
  ): Promise<IDocumentDto> {
    const entity = this.repo.create({
      ownerId,
      documentType: dto.documentType,
      estado: DocumentStatus.PENDIENTE,
      source,
      rucEmisor: dto.rucEmisor,
      razonSocialEmisor: dto.razonSocialEmisor ?? null,
      numeroFactura: dto.numeroFactura,
      claveAcceso: dto.claveAcceso ?? null,
      fechaEmision: dto.fechaEmision ?? null,
      subtotal: dto.subtotal,
      iva: dto.iva,
      total: dto.total,
      storageBucket: dto.storageKey ? this.bucket : null,
      storageKey: dto.storageKey ?? null,
      items: dto.items.map((i) => ({
        descripcion: i.descripcion,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        descuento: i.descuento ?? 0,
        total: i.total,
      })),
      taxes: dto.taxes.map((t) => ({
        codigo: t.codigo,
        tarifa: t.tarifa,
        baseImponible: t.baseImponible,
        valor: t.valor,
      })),
    });

    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  async findPaginated(
    ownerId: string | null,
    page: number,
    limit: number,
  ): Promise<[IDocumentDto[], number]> {
    const [rows, total] = await this.repo.findAndCount({
      where: { ownerId: this.owner(ownerId) } as FindOptionsWhere<DocumentOrmEntity>,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return [rows.map((r) => this.toDto(r)), total];
  }

  async findById(
    id: string,
    ownerId: string | null,
  ): Promise<IDocumentDto | null> {
    const row = await this.repo.findOne({
      where: { id, ownerId: this.owner(ownerId) } as FindOptionsWhere<DocumentOrmEntity>,
    });
    return row ? this.toDto(row) : null;
  }

  async existsByNumero(
    ownerId: string | null,
    rucEmisor: string,
    numeroFactura: string,
  ): Promise<boolean> {
    const count = await this.repo.count({
      where: {
        ownerId: this.owner(ownerId),
        rucEmisor,
        numeroFactura,
      } as FindOptionsWhere<DocumentOrmEntity>,
    });
    return count > 0;
  }

  async getStorageRef(
    id: string,
    ownerId: string | null,
  ): Promise<{ bucket: string; key: string } | null> {
    const row = await this.repo.findOne({
      where: { id, ownerId: this.owner(ownerId) } as FindOptionsWhere<DocumentOrmEntity>,
      select: ['id', 'storageBucket', 'storageKey'],
    });
    if (!row || !row.storageKey) return null;
    return { bucket: row.storageBucket ?? this.bucket, key: row.storageKey };
  }

  // ── Mapper ORM → DTO ──────────────────────────────────────────────────────
  private toDto(o: DocumentOrmEntity): IDocumentDto {
    return {
      id: o.id,
      documentType: o.documentType as DocumentType,
      estado: o.estado as DocumentStatus,
      source: o.source,
      rucEmisor: o.rucEmisor,
      razonSocialEmisor: o.razonSocialEmisor,
      numeroFactura: o.numeroFactura,
      claveAcceso: o.claveAcceso,
      fechaEmision: o.fechaEmision,
      subtotal: o.subtotal,
      iva: o.iva,
      total: o.total,
      items: (o.items ?? []).map((i) => ({
        id: i.id,
        descripcion: i.descripcion,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        descuento: i.descuento,
        total: i.total,
      })),
      taxes: (o.taxes ?? []).map((t) => ({
        id: t.id,
        codigo: t.codigo,
        tarifa: t.tarifa,
        baseImponible: t.baseImponible,
        valor: t.valor,
      })),
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  }
}
