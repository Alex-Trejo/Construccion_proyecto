import { Test, type TestingModule } from '@nestjs/testing';
import { DocumentTcpController } from './document-tcp.controller';
import { ProcessPhysicalDocumentUseCase } from '../application/use-cases/importing/process-physical-document.use-case';
import { CreateDocumentUseCase, UpdateDocumentUseCase } from '../application/use-cases/mutations/create-document.use-case';
import { FindDocumentsUseCase, FindDocumentByIdUseCase, GetDocumentPreviewUseCase } from '../application/use-cases/queries/find-documents.use-case';
import { ProcessTxtBatchUseCase } from '../application/use-cases/importing/process-txt-batch.use-case';
import { ImportSriDocumentsUseCase } from '../application/use-cases/importing/import-sri-documents.use-case';
import { ValidatePendingDocumentsUseCase, AdvanceDocumentStatusUseCase, ValidateDocumentUseCase } from '../application/use-cases/validations/validate-document.use-case';
import { ListImportErrorsUseCase } from '../application/use-cases/queries/list-import-errors.use-case';
import { DashboardMetricsUseCase, ExportDocumentsUseCase } from '../application/use-cases/queries/reports.use-cases';
import { DocumentStatus } from '@sgc/shared';

describe('DocumentTcpController', () => {
  let controller: DocumentTcpController;

  const mockPayload = (data: any = {}) => ({
    data,
    metadata: { userId: 'user-id', role: 'admin' },
  });

  const mockUseCases = {
    processPhysical: { execute: jest.fn() },
    createDocument: { execute: jest.fn() },
    updateDocument: { execute: jest.fn() },
    findDocuments: { execute: jest.fn() },
    findById: { execute: jest.fn() },
    getPreview: { execute: jest.fn() },
    processTxtBatch: { execute: jest.fn() },
    importSriDocuments: { processPending: jest.fn() },
    validatePending: { execute: jest.fn() },
    validateDocument: { execute: jest.fn() },
    advanceStatus: { execute: jest.fn() },
    listImportErrors: { execute: jest.fn() },
    dashboardMetrics: { execute: jest.fn() },
    exportDocuments: { execute: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentTcpController],
      providers: [
        { provide: ProcessPhysicalDocumentUseCase, useValue: mockUseCases.processPhysical },
        { provide: CreateDocumentUseCase, useValue: mockUseCases.createDocument },
        { provide: UpdateDocumentUseCase, useValue: mockUseCases.updateDocument },
        { provide: FindDocumentsUseCase, useValue: mockUseCases.findDocuments },
        { provide: FindDocumentByIdUseCase, useValue: mockUseCases.findById },
        { provide: GetDocumentPreviewUseCase, useValue: mockUseCases.getPreview },
        { provide: ProcessTxtBatchUseCase, useValue: mockUseCases.processTxtBatch },
        { provide: ImportSriDocumentsUseCase, useValue: mockUseCases.importSriDocuments },
        { provide: ValidatePendingDocumentsUseCase, useValue: mockUseCases.validatePending },
        { provide: ValidateDocumentUseCase, useValue: mockUseCases.validateDocument },
        { provide: AdvanceDocumentStatusUseCase, useValue: mockUseCases.advanceStatus },
        { provide: ListImportErrorsUseCase, useValue: mockUseCases.listImportErrors },
        { provide: DashboardMetricsUseCase, useValue: mockUseCases.dashboardMetrics },
        { provide: ExportDocumentsUseCase, useValue: mockUseCases.exportDocuments },
      ],
    }).compile();

    controller = module.get<DocumentTcpController>(DocumentTcpController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('physical', () => {
    it('should call processPhysical', async () => {
      mockUseCases.processPhysical.execute.mockResolvedValue({ text: 'test' });
      const result = await controller.physical(mockPayload({ contentBase64: 'YmFzZTY0', filename: 'test.pdf', contentType: 'application/pdf' }));
      expect(result).toEqual({ text: 'test' });
      expect(mockUseCases.processPhysical.execute).toHaveBeenCalledWith({
        content: Buffer.from('YmFzZTY0', 'base64'),
        filename: 'test.pdf',
        contentType: 'application/pdf',
      }, 'user-id');
    });
  });

  describe('create', () => {
    it('should call createDocument', async () => {
      mockUseCases.createDocument.execute.mockResolvedValue({ id: 'doc1' });
      const result = await controller.create(mockPayload({ type: 'INVOICE' }));
      expect(result).toEqual({ id: 'doc1' });
      expect(mockUseCases.createDocument.execute).toHaveBeenCalledWith({ type: 'INVOICE' }, 'user-id');
    });
  });

  describe('edit', () => {
    it('should call updateDocument', async () => {
      mockUseCases.updateDocument.execute.mockResolvedValue({ id: 'doc1' });
      const result = await controller.edit(mockPayload({ id: 'doc1', dto: { total: 100 } }));
      expect(result).toEqual({ id: 'doc1' });
      expect(mockUseCases.updateDocument.execute).toHaveBeenCalledWith('doc1', 'user-id', { total: 100 });
    });
  });

  describe('findAll', () => {
    it('should call findDocuments', async () => {
      mockUseCases.findDocuments.execute.mockResolvedValue({ data: [], meta: {} });
      const result = await controller.findAll(mockPayload({ page: 1, limit: 10 }));
      expect(result).toEqual({ data: [], meta: {} });
      expect(mockUseCases.findDocuments.execute).toHaveBeenCalledWith('user-id', 1, 10);
    });
  });

  describe('detail', () => {
    it('should call findById', async () => {
      mockUseCases.findById.execute.mockResolvedValue({ id: 'doc1' });
      const result = await controller.detail(mockPayload({ id: 'doc1' }));
      expect(result).toEqual({ id: 'doc1' });
      expect(mockUseCases.findById.execute).toHaveBeenCalledWith('doc1', 'user-id');
    });
  });

  describe('preview', () => {
    it('should call getPreview', async () => {
      mockUseCases.getPreview.execute.mockResolvedValue({ url: 'http://test' });
      const result = await controller.preview(mockPayload({ id: 'doc1' }));
      expect(result).toEqual({ url: 'http://test' });
      expect(mockUseCases.getPreview.execute).toHaveBeenCalledWith('doc1', 'user-id');
    });
  });

  describe('bulkTxt', () => {
    it('should call processTxtBatch and trigger background import', async () => {
      mockUseCases.processTxtBatch.execute.mockResolvedValue({ staged: 1 });
      mockUseCases.importSriDocuments.processPending.mockResolvedValue(undefined);
      
      const result = await controller.bulkTxt(mockPayload({ txtContent: 'test' }));
      
      expect(result).toEqual({ staged: 1 });
      expect(mockUseCases.processTxtBatch.execute).toHaveBeenCalledWith('test', 'user-id');
      expect(mockUseCases.importSriDocuments.processPending).toHaveBeenCalledWith('user-id');
    });
    
    it('should handle background import error gracefully', async () => {
      mockUseCases.processTxtBatch.execute.mockResolvedValue({ staged: 1 });
      mockUseCases.importSriDocuments.processPending.mockRejectedValue(new Error('background error'));
      
      const result = await controller.bulkTxt(mockPayload({ txtContent: 'test' }));
      
      expect(result).toEqual({ staged: 1 });
      // Error is caught internally and logged
    });
  });

  describe('Status and validations', () => {
    it('should call validatePendingDocs', async () => {
      mockUseCases.validatePending.execute.mockResolvedValue({ validCount: 1 });
      const result = await controller.validatePendingDocs(mockPayload({}));
      expect(result).toEqual({ validCount: 1 });
      expect(mockUseCases.validatePending.execute).toHaveBeenCalledWith('user-id');
    });

    it('should call setStatus (revalidate)', async () => {
      mockUseCases.validateDocument.execute.mockResolvedValue(undefined);
      await controller.setStatus(mockPayload({ id: 'doc1', action: 'revalidate' }));
      expect(mockUseCases.validateDocument.execute).toHaveBeenCalledWith('doc1', 'user-id');
    });

    it('should call setStatus (consolidate)', async () => {
      mockUseCases.advanceStatus.execute.mockResolvedValue({ id: 'doc1' });
      const result = await controller.setStatus(mockPayload({ id: 'doc1', action: 'consolidate' }));
      expect(result).toEqual({ id: 'doc1' });
      expect(mockUseCases.advanceStatus.execute).toHaveBeenCalledWith('doc1', 'user-id', DocumentStatus.CONSOLIDADO);
    });
  });

  describe('Imports and Exports', () => {
    it('should call importErrors', async () => {
      mockUseCases.listImportErrors.execute.mockResolvedValue([]);
      const result = await controller.importErrors(mockPayload({}));
      expect(result).toEqual([]);
      expect(mockUseCases.listImportErrors.execute).toHaveBeenCalledWith('user-id');
    });

    it('should call retryImports', async () => {
      mockUseCases.listImportErrors.execute.mockResolvedValue([{}]);
      mockUseCases.importSriDocuments.retryFailed.mockResolvedValue(undefined);
      const result = await controller.retryImports(mockPayload({}));
      expect(result).toEqual({ retried: 1 });
      expect(mockUseCases.listImportErrors.execute).toHaveBeenCalledWith('user-id');
      expect(mockUseCases.importSriDocuments.retryFailed).toHaveBeenCalledWith('user-id');
    });

    it('should catch error in retryImports background task silently', async () => {
      mockUseCases.listImportErrors.execute.mockResolvedValue([{}]);
      mockUseCases.importSriDocuments.retryFailed.mockRejectedValue(new Error('bg err'));
      const loggerErrorSpy = jest.spyOn((controller as any).logger, 'error');
      await controller.retryImports(mockPayload({}));
      // Need a tiny timeout to let the unhandled promise catch run
      await new Promise(r => setTimeout(r, 0));
      expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('bg err'));
    });

    it('should call metrics', async () => {
      mockUseCases.dashboardMetrics.execute.mockResolvedValue({ total: 10 });
      const result = await controller.metrics(mockPayload({ range: 'month' }));
      expect(result).toEqual({ total: 10 });
      expect(mockUseCases.dashboardMetrics.execute).toHaveBeenCalledWith('user-id', { range: 'month' });
    });

    it('should call exportRows', async () => {
      mockUseCases.exportDocuments.execute.mockResolvedValue([{ id: '1' }]);
      const result = await controller.exportRows(mockPayload({ range: 'month' }));
      expect(result).toEqual([{ id: '1' }]);
      expect(mockUseCases.exportDocuments.execute).toHaveBeenCalledWith('user-id', { range: 'month' });
    });
  });
});
