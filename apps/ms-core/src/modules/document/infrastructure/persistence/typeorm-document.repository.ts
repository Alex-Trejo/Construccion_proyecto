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
import { In, Repository, type FindOptionsWhere } from 'typeorm';
import {
  DocumentStatus,
  DocumentType,
  type IDashboardFilters,
  type ICreateDocumentDto,
  type IDocumentDto,
  type IUpdateDocumentDto,
} from '@sgc/shared';

import { type DocumentRepositoryPort } from '../../domain/ports/document-repository.port';
import { DocumentOrmEntity } from './document.orm-entity';
import { DocumentItemOrmEntity } from './document-item.orm-entity';
import { DocumentTaxOrmEntity } from './document-tax.orm-entity';

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

  async save(
    dto: ICreateDocumentDto,
    ownerId: string | null,
    source: string,
  ): Promise<IDocumentDto> {
    const entity = this.repo.create({
      ownerId,
      documentType: dto.documentType,
      estado: DocumentStatus.PENDIENTE,
      observaciones: null,
      xmlContent: dto.xmlContent ?? null,
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

  // ── Lecturas COMPARTIDAS a nivel empresa (single-tenant) ──────────────────
  // No se filtra por dueño: todos los roles ven todos los comprobantes. El
  // `owner_id` se conserva solo como AUDITORÍA (quién lo subió, en `save`).
  // El control de permisos lo aplica el RBAC del gateway (@Roles).

  async findPaginated(
    _ownerId: string | null,
    page: number,
    limit: number,
  ): Promise<[IDocumentDto[], number]> {
    const [rows, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return [rows.map((r) => this.toDto(r)), total];
  }

  async findById(
    id: string,
    _ownerId: string | null,
  ): Promise<IDocumentDto | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDto(row) : null;
  }

  async findByStatuses(
    _ownerId: string | null,
    estados: ReadonlyArray<DocumentStatus>,
  ): Promise<IDocumentDto[]> {
    if (estados.length === 0) return [];
    const rows = await this.repo.find({
      where: { estado: In(estados as DocumentStatus[]) } as FindOptionsWhere<DocumentOrmEntity>,
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async updateStatus(
    id: string,
    _ownerId: string | null,
    estado: DocumentStatus,
    observaciones: string | null,
  ): Promise<IDocumentDto | null> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) return null;
    row.estado = estado;
    row.observaciones = observaciones;
    const saved = await this.repo.save(row);
    return this.toDto(saved);
  }

  async updateDocument(
    id: string,
    _ownerId: string | null,
    dto: IUpdateDocumentDto,
  ): Promise<IDocumentDto | null> {
    // Todo en una transacción: cabecera + reemplazo total de ítems/impuestos.
    // Se borran los hijos viejos y se insertan los nuevos EXPLÍCITAMENTE para
    // no depender del manejo de huérfanos de TypeORM (que intenta nullificar
    // la FK document_id, lo cual viola el NOT NULL).
    return this.repo.manager.transaction(async (manager) => {
      const docRepo = manager.getRepository(DocumentOrmEntity);
      const itemRepo = manager.getRepository(DocumentItemOrmEntity);
      const taxRepo = manager.getRepository(DocumentTaxOrmEntity);

      const row = await docRepo.findOne({ where: { id } });
      if (!row) return null;

      row.documentType = dto.documentType;
      row.razonSocialEmisor = dto.razonSocialEmisor ?? null;
      row.fechaEmision = dto.fechaEmision ?? null;
      row.subtotal = dto.subtotal;
      row.iva = dto.iva;
      row.total = dto.total;
      // Al editar, se reinicia el estado para revalidar con los datos nuevos.
      row.estado = DocumentStatus.PENDIENTE;
      row.observaciones = null;
      // NO se asignan row.items/row.taxes: si se tocaran, el cascade intentaría
      // reconciliar (y nullificar) los hijos. Los gestionamos a mano abajo.
      await docRepo.save(row);

      // Borrar hijos viejos e insertar los nuevos con la FK explícita.
      await itemRepo.delete({ documentId: id });
      await taxRepo.delete({ documentId: id });

      if (dto.items.length > 0) {
        await itemRepo.insert(
          dto.items.map((i) => ({
            documentId: id,
            descripcion: i.descripcion,
            cantidad: i.cantidad,
            precioUnitario: i.precioUnitario,
            descuento: i.descuento ?? 0,
            total: i.total,
          })),
        );
      }
      if (dto.taxes.length > 0) {
        await taxRepo.insert(
          dto.taxes.map((t) => ({
            documentId: id,
            codigo: t.codigo,
            tarifa: t.tarifa,
            baseImponible: t.baseImponible,
            valor: t.valor,
          })),
        );
      }

      const reloaded = await docRepo.findOne({ where: { id } });
      return reloaded ? this.toDto(reloaded) : null;
    });
  }

  async findForExport(
    _ownerId: string | null,
    filters?: IDashboardFilters,
  ): Promise<IDocumentDto[]> {
    const qb = this.repo.createQueryBuilder('d').where('1=1');
    if (filters?.desde) qb.andWhere('d.fechaEmision >= :desde', { desde: filters.desde });
    if (filters?.hasta) qb.andWhere('d.fechaEmision <= :hasta', { hasta: filters.hasta });
    if (filters?.documentType) {
      qb.andWhere('d.documentType = :tipo', { tipo: filters.documentType });
    }
    qb.orderBy('d.createdAt', 'DESC');
    const rows = await qb.getMany();
    return rows.map((r) => this.toDto(r));
  }

  /** Unicidad GLOBAL (empresa): RUC + número, sin importar quién lo subió. */
  async existsByNumero(
    _ownerId: string | null,
    rucEmisor: string,
    numeroFactura: string,
  ): Promise<boolean> {
    const count = await this.repo.count({ where: { rucEmisor, numeroFactura } });
    return count > 0;
  }

  async getStorageRef(
    id: string,
    _ownerId: string | null,
  ): Promise<{ bucket: string; key: string } | null> {
    const row = await this.repo.findOne({
      where: { id },
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
      observaciones: o.observaciones,
      xmlContent: o.xmlContent,
      hasOriginal: !!o.storageKey,
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
