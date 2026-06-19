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
import { Repository } from 'typeorm';
import type { IDashboardMetrics, IDocumentDto } from '@sgc/shared';

import { DocumentOrmEntity } from '../../infrastructure/persistence/document.orm-entity';
import {
  type DocumentRepositoryPort,
  DOCUMENT_REPOSITORY_PORT,
} from '../../domain/ports/document-repository.port';

@Injectable()
export class DashboardMetricsUseCase {
  constructor(
    @InjectRepository(DocumentOrmEntity)
    private readonly repo: Repository<DocumentOrmEntity>,
  ) {}

  async execute(ownerId: string | null): Promise<IDashboardMetrics> {
    const ownerClause = ownerId === null ? 'd.ownerId IS NULL' : 'd.ownerId = :ownerId';
    const params = ownerId === null ? {} : { ownerId };

    const totals = await this.repo
      .createQueryBuilder('d')
      .select('COUNT(*)', 'cantidad')
      .addSelect('COALESCE(SUM(d.total), 0)', 'total')
      .where(ownerClause, params)
      .getRawOne<{ cantidad: string; total: string }>();

    const porEstado = await this.repo
      .createQueryBuilder('d')
      .select('d.estado', 'estado')
      .addSelect('COUNT(*)', 'cantidad')
      .addSelect('COALESCE(SUM(d.total), 0)', 'total')
      .where(ownerClause, params)
      .groupBy('d.estado')
      .getRawMany<{ estado: string; cantidad: string; total: string }>();

    const porMes = await this.repo
      .createQueryBuilder('d')
      .select("to_char(d.created_at, 'YYYY-MM')", 'mes')
      .addSelect('COUNT(*)', 'cantidad')
      .addSelect('COALESCE(SUM(d.total), 0)', 'total')
      .where(ownerClause, params)
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

  /** Todas las filas del usuario (para generar el XLSX en el gateway). */
  async execute(ownerId: string | null): Promise<IDocumentDto[]> {
    const [data] = await this.documentRepo.findPaginated(ownerId, 1, 100_000);
    return data;
  }
}
