/**
 * @fileoverview Casos de uso — Reportes (KPIs y export) de comprobantes.
 *
 * KPIs vía agregaciones SQL (filtrados por dueño). Export devuelve las filas
 * que el gateway transforma a XLSX (exceljs).
 *
 * @module ReportsUseCases
 */

import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type SelectQueryBuilder } from 'typeorm';
import type {
  IDashboardFilters,
  IDashboardMetrics,
  IDocumentDto,
} from '@sgc/shared';

import { DocumentOrmEntity } from '../../infrastructure/persistence/document.orm-entity';
import {
  type DocumentRepositoryPort,
  DOCUMENT_REPOSITORY_PORT,
} from '../../domain/ports/document-repository.port';

/**
 * Aplica los filtros opcionales (fecha de emisión y tipo de documento) a un
 * query builder de comprobantes. Los KPIs son COMPARTIDOS a nivel empresa: no
 * se filtra por dueño (single-tenant). El `_ownerId` se mantiene por firma.
 */
export function applyDocumentFilters(
  qb: SelectQueryBuilder<DocumentOrmEntity>,
  _ownerId: string | null,
  filters?: IDashboardFilters,
): SelectQueryBuilder<DocumentOrmEntity> {
  qb.where('1=1');
  if (filters?.desde) qb.andWhere('d.fechaEmision >= :desde', { desde: filters.desde });
  if (filters?.hasta) qb.andWhere('d.fechaEmision <= :hasta', { hasta: filters.hasta });
  if (filters?.documentType) {
    qb.andWhere('d.documentType = :tipo', { tipo: filters.documentType });
  }
  return qb;
}

@Injectable()
export class DashboardMetricsUseCase {
  constructor(
    @InjectRepository(DocumentOrmEntity)
    private readonly repo: Repository<DocumentOrmEntity>,
  ) {}

  async execute(
    ownerId: string | null,
    filters?: IDashboardFilters,
  ): Promise<IDashboardMetrics> {
    const totals = await applyDocumentFilters(
      this.repo.createQueryBuilder('d'),
      ownerId,
      filters,
    )
      .select('COUNT(*)', 'cantidad')
      .addSelect('COALESCE(SUM(d.total), 0)', 'total')
      .getRawOne<{ cantidad: string; total: string }>();

    const porEstado = await applyDocumentFilters(
      this.repo.createQueryBuilder('d'),
      ownerId,
      filters,
    )
      .select('d.estado', 'estado')
      .addSelect('COUNT(*)', 'cantidad')
      .addSelect('COALESCE(SUM(d.total), 0)', 'total')
      .groupBy('d.estado')
      .getRawMany<{ estado: string; cantidad: string; total: string }>();

    const porMes = await applyDocumentFilters(
      this.repo.createQueryBuilder('d'),
      ownerId,
      filters,
    )
      .select("to_char(d.created_at, 'YYYY-MM')", 'mes')
      .addSelect('COUNT(*)', 'cantidad')
      .addSelect('COALESCE(SUM(d.total), 0)', 'total')
      .groupBy('mes')
      .orderBy('mes', 'ASC')
      .getRawMany<{ mes: string; cantidad: string; total: string }>();

    return {
      totalGastado: Number(totals?.total ?? 0),
      totalComprobantes: Number(totals?.cantidad ?? 0),
      porEstado: porEstado.map((r) => ({
        estado: r.estado,
        cantidad: Number(r.cantidad),
        total: Number(r.total),
      })),
      porMes: porMes.map((r) => ({
        mes: r.mes,
        cantidad: Number(r.cantidad),
        total: Number(r.total),
      })),
    };
  }
}

@Injectable()
export class ExportDocumentsUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY_PORT)
    private readonly documentRepo: DocumentRepositoryPort,
  ) {}

  /** Filas del usuario (filtradas) para generar el XLSX depurado en el gateway. */
  async execute(
    ownerId: string | null,
    filters?: IDashboardFilters,
  ): Promise<IDocumentDto[]> {
    return this.documentRepo.findForExport(ownerId, filters);
  }
}
