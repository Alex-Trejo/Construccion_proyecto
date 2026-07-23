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
  DocumentStatus,
  type ICreateDocumentDto,
  type IDashboardFilters,
  type IDashboardMetrics,
  type IDocumentDto,
  type IImportErrorDto,
  type IOcrResultDto,
  type IPaginatedDocuments,
  type IUpdateDocumentDto,
  type TcpPayload,
} from '@sgc/shared';

import { ProcessPhysicalDocumentUseCase } from '../application/use-cases/importing/process-physical-document.use-case';
import {
  CreateDocumentUseCase,
  UpdateDocumentUseCase,
} from '../application/use-cases/mutations/create-document.use-case';
import {
  FindDocumentsUseCase,
  FindDocumentByIdUseCase,
  GetDocumentPreviewUseCase,
} from '../application/use-cases/queries/find-documents.use-case';
import { ProcessTxtBatchUseCase } from '../application/use-cases/importing/process-txt-batch.use-case';
import { ImportSriDocumentsUseCase } from '../application/use-cases/importing/import-sri-documents.use-case';
import {
  ValidatePendingDocumentsUseCase,
  AdvanceDocumentStatusUseCase,
  ValidateDocumentUseCase,
  type ValidatePendingResult,
} from '../application/use-cases/validations/validate-document.use-case';
import { ListImportErrorsUseCase } from '../application/use-cases/queries/list-import-errors.use-case';
import {
  DashboardMetricsUseCase,
  ExportDocumentsUseCase,
} from '../application/use-cases/queries/reports.use-cases';

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
    private readonly updateDocument: UpdateDocumentUseCase,
    private readonly findDocuments: FindDocumentsUseCase,
    private readonly findById: FindDocumentByIdUseCase,
    private readonly getPreview: GetDocumentPreviewUseCase,
    private readonly processTxtBatch: ProcessTxtBatchUseCase,
    private readonly importSriDocuments: ImportSriDocumentsUseCase,
    private readonly validatePending: ValidatePendingDocumentsUseCase,
    private readonly validateDocument: ValidateDocumentUseCase,
    private readonly advanceStatus: AdvanceDocumentStatusUseCase,
    private readonly listImportErrors: ListImportErrorsUseCase,
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

  @MessagePattern(DOCUMENT_PATTERNS.EDIT)
  async edit(
    payload: TcpPayload<{ id: string; dto: IUpdateDocumentDto }>,
  ): Promise<IDocumentDto> {
    return this.updateDocument.execute(
      payload.data.id,
      payload.metadata.userId,
      payload.data.dto,
    );
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
    const ownerId = payload.metadata.userId;
    this.logger.debug(`TCP UPLOAD_BATCH_TXT owner=${ownerId}`);

    // 1) Stagear las claves (rápido) → respuesta inmediata al usuario.
    const result = await this.processTxtBatch.execute(
      payload.data.txtContent,
      ownerId,
    );

    // 2) Procesar contra el SRI en segundo plano (no se espera): descarga el
    //    XML por clave, lo parsea y crea los comprobantes completos. La lista
    //    del frontend los verá aparecer al refrescar/hacer polling.
    void this.importSriDocuments.processPending(ownerId).catch((error) => {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Importación SRI en segundo plano falló: ${msg}`);
    });

    return result;
  }

  @MessagePattern(DOCUMENT_PATTERNS.METRICS)
  async metrics(
    payload: TcpPayload<IDashboardFilters>,
  ): Promise<IDashboardMetrics> {
    return this.dashboardMetrics.execute(payload.metadata.userId, payload.data);
  }

  @MessagePattern(DOCUMENT_PATTERNS.EXPORT)
  async exportRows(
    payload: TcpPayload<IDashboardFilters>,
  ): Promise<IDocumentDto[]> {
    return this.exportDocuments.execute(payload.metadata.userId, payload.data);
  }

  @MessagePattern(DOCUMENT_PATTERNS.VALIDATE_PENDING)
  async validatePendingDocs(
    payload: TcpPayload<Record<string, never>>,
  ): Promise<ValidatePendingResult> {
    this.logger.debug('TCP VALIDATE_PENDING');
    return this.validatePending.execute(payload.metadata.userId);
  }

  @MessagePattern(DOCUMENT_PATTERNS.SET_STATUS)
  async setStatus(
    payload: TcpPayload<{ id: string; action: 'consolidate' | 'revalidate' }>,
  ): Promise<IDocumentDto | null> {
    const ownerId = payload.metadata.userId;
    const { id, action } = payload.data;
    this.logger.debug(`TCP SET_STATUS ${id} action=${action}`);
    if (action === 'consolidate') {
      return this.advanceStatus.execute(id, ownerId, DocumentStatus.CONSOLIDADO);
    }
    return this.validateDocument.execute(id, ownerId);
  }

  @MessagePattern(DOCUMENT_PATTERNS.LIST_IMPORT_ERRORS)
  async importErrors(
    payload: TcpPayload<Record<string, never>>,
  ): Promise<IImportErrorDto[]> {
    this.logger.debug('TCP LIST_IMPORT_ERRORS');
    return this.listImportErrors.execute(payload.metadata.userId);
  }

  @MessagePattern(DOCUMENT_PATTERNS.RETRY_IMPORTS)
  async retryImports(
    payload: TcpPayload<Record<string, never>>,
  ): Promise<{ retried: number }> {
    const ownerId = payload.metadata.userId;
    this.logger.debug(`TCP RETRY_IMPORTS owner=${ownerId}`);
    // Cuenta las claves a reintentar y lanza el reproceso en segundo plano.
    const failed = await this.listImportErrors.execute(ownerId);
    void this.importSriDocuments.retryFailed(ownerId).catch((error) => {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Reintento de importación falló: ${msg}`);
    });
    return { retried: failed.length };
  }
}
