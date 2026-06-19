/**
 * @fileoverview Controller TCP — Comprobantes (Document).
 *
 * Expone las operaciones del módulo de comprobantes al api-gateway. Todas
 * aplican aislamiento por dueño (ownerId = payload.metadata.userId).
 *
 * @module DocumentTcpController
 */

import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import {
  DOCUMENT_PATTERNS,
  type ICreateDocumentDto,
  type IDashboardMetrics,
  type IDocumentDto,
  type IOcrResultDto,
  type IPaginatedDocuments,
  type TcpPayload,
} from '@sgc/shared';

import { ProcessPhysicalDocumentUseCase } from '../application/use-cases/process-physical-document.use-case';
import { CreateDocumentUseCase } from '../application/use-cases/create-document.use-case';
import {
  FindDocumentsUseCase,
  FindDocumentByIdUseCase,
  GetDocumentPreviewUseCase,
} from '../application/use-cases/find-documents.use-case';
import { ProcessTxtBatchUseCase } from '../application/use-cases/process-txt-batch.use-case';
import {
  DashboardMetricsUseCase,
  ExportDocumentsUseCase,
} from '../application/use-cases/reports.use-cases';

interface PhysicalPayload {
  readonly contentBase64: string;
  readonly filename: string;
  readonly contentType: string;
}

@Controller()
export class DocumentTcpController {
  private readonly logger = new Logger(DocumentTcpController.name);

  constructor(
    private readonly processPhysical: ProcessPhysicalDocumentUseCase,
    private readonly createDocument: CreateDocumentUseCase,
    private readonly findDocuments: FindDocumentsUseCase,
    private readonly findById: FindDocumentByIdUseCase,
    private readonly getPreview: GetDocumentPreviewUseCase,
    private readonly processTxtBatch: ProcessTxtBatchUseCase,
    private readonly dashboardMetrics: DashboardMetricsUseCase,
    private readonly exportDocuments: ExportDocumentsUseCase,
  ) {}

  @MessagePattern(DOCUMENT_PATTERNS.PROCESS_PHYSICAL)
  async physical(payload: TcpPayload<PhysicalPayload>): Promise<IOcrResultDto> {
    const ownerId = payload.metadata.userId;
    this.logger.debug(`TCP PROCESS_PHYSICAL (${payload.data.filename}) owner=${ownerId}`);
    return this.processPhysical.execute(
      {
        content: Buffer.from(payload.data.contentBase64, 'base64'),
        filename: payload.data.filename,
        contentType: payload.data.contentType,
      },
      ownerId,
    );
  }

  @MessagePattern(DOCUMENT_PATTERNS.CREATE)
  async create(payload: TcpPayload<ICreateDocumentDto>): Promise<IDocumentDto> {
    return this.createDocument.execute(payload.data, payload.metadata.userId);
  }

  @MessagePattern(DOCUMENT_PATTERNS.FIND_ALL)
  async findAll(
    payload: TcpPayload<{ page: number; limit: number }>,
  ): Promise<IPaginatedDocuments> {
    return this.findDocuments.execute(
      payload.metadata.userId,
      payload.data.page,
      payload.data.limit,
    );
  }

  @MessagePattern(DOCUMENT_PATTERNS.FIND_BY_ID)
  async detail(payload: TcpPayload<{ id: string }>): Promise<IDocumentDto> {
    return this.findById.execute(payload.data.id, payload.metadata.userId);
  }

  @MessagePattern(DOCUMENT_PATTERNS.PREVIEW)
  async preview(
    payload: TcpPayload<{ id: string }>,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    return this.getPreview.execute(payload.data.id, payload.metadata.userId);
  }

  @MessagePattern(DOCUMENT_PATTERNS.UPLOAD_BATCH_TXT)
  async bulkTxt(payload: TcpPayload<{ txtContent: string }>) {
    this.logger.debug('TCP UPLOAD_BATCH_TXT');
    return this.processTxtBatch.execute(payload.data.txtContent);
  }

  @MessagePattern(DOCUMENT_PATTERNS.METRICS)
  async metrics(
    payload: TcpPayload<Record<string, never>>,
  ): Promise<IDashboardMetrics> {
    return this.dashboardMetrics.execute(payload.metadata.userId);
  }

  @MessagePattern(DOCUMENT_PATTERNS.EXPORT)
  async exportRows(
    payload: TcpPayload<Record<string, never>>,
  ): Promise<IDocumentDto[]> {
    return this.exportDocuments.execute(payload.metadata.userId);
  }
}
