import { NotFoundException } from '@nestjs/common';
import { DocumentStatus } from '@sgc/shared';
import {
  ValidateDocumentUseCase,
  ValidatePendingDocumentsUseCase,
  AdvanceDocumentStatusUseCase,
} from '../validations/validate-document.use-case';
import { type DocumentRepositoryPort } from '../../../domain/ports/document-repository.port';
import { DocumentValidationService } from '../../../domain/services/document-validation.service';

describe('Validate Document Use Cases', () => {
  let documentRepoMock: jest.Mocked<DocumentRepositoryPort>;
  let validationServiceMock: jest.Mocked<DocumentValidationService>;

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
    } as unknown as jest.Mocked<DocumentRepositoryPort>;

    validationServiceMock = {
      evaluate: jest.fn(),
    } as unknown as jest.Mocked<DocumentValidationService>;
  });

  describe('ValidateDocumentUseCase', () => {
    let validateUseCase: ValidateDocumentUseCase;

    beforeEach(() => {
      validateUseCase = new ValidateDocumentUseCase(documentRepoMock, validationServiceMock);
    });

    it('debe validar y transicionar a VALIDADO si no hay inconsistencias', async () => {
      documentRepoMock.findById.mockResolvedValue(mockDocument);
      validationServiceMock.evaluate.mockReturnValue({
        status: DocumentStatus.VALIDADO,
        issues: [],
      });
      documentRepoMock.updateStatus.mockImplementation(async (id, ownerId, status, obs) => ({
        ...mockDocument,
        estado: status,
        observaciones: obs,
      }));

      const result = await validateUseCase.execute(mockDocId, mockOwnerId);

      // Debe transicionar a EN_VALIDACION primero
      expect(documentRepoMock.updateStatus).toHaveBeenNthCalledWith(
        1,
        mockDocId,
        mockOwnerId,
        DocumentStatus.EN_VALIDACION,
        null,
      );
      
      // Luego a VALIDADO
      expect(documentRepoMock.updateStatus).toHaveBeenNthCalledWith(
        2,
        mockDocId,
        mockOwnerId,
        DocumentStatus.VALIDADO,
        null,
      );
      
      expect(result?.estado).toBe(DocumentStatus.VALIDADO);
      expect(result?.observaciones).toBeNull();
    });

    it('debe transicionar a INCONSISTENTE si hay errores matematicos', async () => {
      documentRepoMock.findById.mockResolvedValue(mockDocument);
      validationServiceMock.evaluate.mockReturnValue({
        status: DocumentStatus.INCONSISTENTE,
        issues: ['El subtotal + IVA no cuadra con el total'],
      });
      documentRepoMock.updateStatus.mockImplementation(async (id, ownerId, status, obs) => ({
        ...mockDocument,
        estado: status,
        observaciones: obs,
      }));

      const result = await validateUseCase.execute(mockDocId, mockOwnerId);

      expect(documentRepoMock.updateStatus).toHaveBeenNthCalledWith(
        2,
        mockDocId,
        mockOwnerId,
        DocumentStatus.INCONSISTENTE,
        'El subtotal + IVA no cuadra con el total',
      );
      
      expect(result?.estado).toBe(DocumentStatus.INCONSISTENTE);
      expect(result?.observaciones).toContain('no cuadra');
    });

    it('debe saltar la validacion si el estado no es valido para re-validar', async () => {
      const consolidatedDoc = { ...mockDocument, estado: DocumentStatus.CONSOLIDADO };
      documentRepoMock.findById.mockResolvedValue(consolidatedDoc);

      const result = await validateUseCase.execute(mockDocId, mockOwnerId);

      expect(validationServiceMock.evaluate).not.toHaveBeenCalled();
      expect(result).toEqual(consolidatedDoc);
    });
  });

  describe('AdvanceDocumentStatusUseCase', () => {
    let advanceUseCase: AdvanceDocumentStatusUseCase;

    beforeEach(() => {
      advanceUseCase = new AdvanceDocumentStatusUseCase(documentRepoMock);
    });

    it('debe avanzar el estado de VALIDADO a CONSOLIDADO', async () => {
      documentRepoMock.findById.mockResolvedValue({
        ...mockDocument,
        estado: DocumentStatus.VALIDADO,
      });
      documentRepoMock.updateStatus.mockResolvedValue({
        ...mockDocument,
        estado: DocumentStatus.CONSOLIDADO,
      });

      const result = await advanceUseCase.execute(
        mockDocId,
        mockOwnerId,
        DocumentStatus.CONSOLIDADO,
      );

      expect(documentRepoMock.updateStatus).toHaveBeenCalledWith(
        mockDocId,
        mockOwnerId,
        DocumentStatus.CONSOLIDADO,
        null,
      );
      expect(result.estado).toBe(DocumentStatus.CONSOLIDADO);
    });

    it('debe lanzar error si intenta saltar de PENDIENTE a CONSOLIDADO', async () => {
      documentRepoMock.findById.mockResolvedValue(mockDocument); // está en PENDIENTE

      await expect(
        advanceUseCase.execute(mockDocId, mockOwnerId, DocumentStatus.CONSOLIDADO),
      ).rejects.toThrow();
      expect(documentRepoMock.updateStatus).not.toHaveBeenCalled();
    });
  });
});
