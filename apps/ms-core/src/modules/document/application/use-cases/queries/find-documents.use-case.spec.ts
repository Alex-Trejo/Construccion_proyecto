import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentStatus } from '@sgc/shared';
import {
  FindDocumentsUseCase,
  FindDocumentByIdUseCase,
  GetDocumentPreviewUseCase,
} from '../queries/find-documents.use-case';
import { type DocumentRepositoryPort } from '../../../domain/ports/document-repository.port';
import { type ObjectStoragePort } from '../../../../communication/domain/ports/object-storage.port';

describe('Find Documents Use Cases', () => {
  let documentRepoMock: jest.Mocked<DocumentRepositoryPort>;
  let storageMock: jest.Mocked<ObjectStoragePort>;
  let configServiceMock: jest.Mocked<ConfigService>;

  const mockOwnerId = 'owner-123';
  const mockDocId = 'doc-123';

  const mockDocument = {
    id: mockDocId,
    ownerId: mockOwnerId,
    rucEmisor: '1712345678001',
    razonSocialEmisor: 'Emisor',
    numeroFactura: '001-002-000000123',
    fechaEmision: '2023-01-01',
    subtotal: 100,
    iva: 12,
    total: 112,
    estado: DocumentStatus.PENDIENTE,
    items: [],
    xmlUrl: null,
    pdfUrl: null,
    source: 'MANUAL',
    observaciones: null,
  };

  beforeEach(() => {
    documentRepoMock = {
      save: jest.fn(),
      existsByNumero: jest.fn(),
      findById: jest.fn(),
      findByStatuses: jest.fn(),
      updateStatus: jest.fn(),
      updateDocument: jest.fn(),
      delete: jest.fn(),
      findPaginated: jest.fn(),
      getStorageRef: jest.fn(),
    } as unknown as jest.Mocked<DocumentRepositoryPort>;

    storageMock = {
      getPresignedUrl: jest.fn(),
      putObject: jest.fn(),
    } as unknown as jest.Mocked<ObjectStoragePort>;

    configServiceMock = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;
  });

  describe('FindDocumentsUseCase', () => {
    it('debe retornar comprobantes paginados', async () => {
      const useCase = new FindDocumentsUseCase(documentRepoMock);
      const data = [mockDocument];
      documentRepoMock.findPaginated.mockResolvedValue([data, 1]);

      const result = await useCase.execute(mockOwnerId, 1, 10);

      expect(documentRepoMock.findPaginated).toHaveBeenCalledWith(mockOwnerId, 1, 10);
      expect(result).toEqual({
        data,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('FindDocumentByIdUseCase', () => {
    it('debe retornar el comprobante si existe', async () => {
      const useCase = new FindDocumentByIdUseCase(documentRepoMock);
      documentRepoMock.findById.mockResolvedValue(mockDocument);

      const result = await useCase.execute(mockDocId, mockOwnerId);

      expect(documentRepoMock.findById).toHaveBeenCalledWith(mockDocId, mockOwnerId);
      expect(result).toEqual(mockDocument);
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      const useCase = new FindDocumentByIdUseCase(documentRepoMock);
      documentRepoMock.findById.mockResolvedValue(null);

      await expect(useCase.execute(mockDocId, mockOwnerId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('GetDocumentPreviewUseCase', () => {
    it('debe retornar la URL pre-firmada si tiene archivo', async () => {
      const useCase = new GetDocumentPreviewUseCase(documentRepoMock, storageMock, configServiceMock);
      documentRepoMock.getStorageRef.mockResolvedValue({ bucket: 'test-bucket', key: 'file.pdf' });
      storageMock.getPresignedUrl.mockResolvedValue('https://minio.test/file.pdf?signed');

      const result = await useCase.execute(mockDocId, mockOwnerId);

      expect(documentRepoMock.getStorageRef).toHaveBeenCalledWith(mockDocId, mockOwnerId);
      expect(storageMock.getPresignedUrl).toHaveBeenCalledWith('test-bucket', 'file.pdf', 300);
      expect(result.url).toBe('https://minio.test/file.pdf?signed');
      expect(result.expiresInSeconds).toBe(300);
    });

    it('debe lanzar NotFoundException si no tiene archivo asociado', async () => {
      const useCase = new GetDocumentPreviewUseCase(documentRepoMock, storageMock, configServiceMock);
      documentRepoMock.getStorageRef.mockResolvedValue(null);

      await expect(useCase.execute(mockDocId, mockOwnerId)).rejects.toThrow(NotFoundException);
    });
  });
});
