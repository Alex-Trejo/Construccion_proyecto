import { ConflictException, NotFoundException } from '@nestjs/common';
import { type ICreateDocumentDto, type IUpdateDocumentDto, DocumentStatus } from '@sgc/shared';
import { CreateDocumentUseCase, UpdateDocumentUseCase } from '../mutations/create-document.use-case';
import { type DocumentRepositoryPort } from '../../../domain/ports/document-repository.port';
import { ValidateDocumentUseCase } from '../validations/validate-document.use-case';

describe('Create/Update Document Use Cases', () => {
  let documentRepoMock: jest.Mocked<DocumentRepositoryPort>;
  let validateDocumentMock: jest.Mocked<ValidateDocumentUseCase>;
  let createUseCase: CreateDocumentUseCase;
  let updateUseCase: UpdateDocumentUseCase;

  const mockOwnerId = 'owner-123';
  const mockDto: ICreateDocumentDto = {
    rucEmisor: '1712345678001',
    razonSocialEmisor: 'Test Emisor',
    numeroFactura: '001-002-000000123',
    fechaEmision: '2023-01-01',
    subtotal: 100,
    iva: 12,
    total: 112,
    items: [],
  };

  const mockSavedDocument = {
    id: 'doc-123',
    ownerId: mockOwnerId,
    rucEmisor: mockDto.rucEmisor,
    razonSocialEmisor: mockDto.razonSocialEmisor,
    numeroFactura: mockDto.numeroFactura,
    fechaEmision: mockDto.fechaEmision,
    subtotal: mockDto.subtotal,
    iva: mockDto.iva,
    total: mockDto.total,
    estado: DocumentStatus.PENDIENTE,
    items: [],
    xmlUrl: null,
    pdfUrl: null,
    source: 'MANUAL_UPLOAD',
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

    validateDocumentMock = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ValidateDocumentUseCase>;

    createUseCase = new CreateDocumentUseCase(documentRepoMock, validateDocumentMock);
    updateUseCase = new UpdateDocumentUseCase(documentRepoMock, validateDocumentMock);
  });

  describe('CreateDocumentUseCase', () => {
    it('debe guardar el comprobante si no existe duplicado y retornar el validado', async () => {
      documentRepoMock.existsByNumero.mockResolvedValue(false);
      documentRepoMock.save.mockResolvedValue(mockSavedDocument);
      validateDocumentMock.execute.mockResolvedValue({
        ...mockSavedDocument,
        estado: DocumentStatus.VALIDADO,
      });

      const result = await createUseCase.execute(mockDto, mockOwnerId);

      expect(documentRepoMock.existsByNumero).toHaveBeenCalledWith(
        mockOwnerId,
        mockDto.rucEmisor,
        mockDto.numeroFactura,
      );
      expect(documentRepoMock.save).toHaveBeenCalled();
      expect(validateDocumentMock.execute).toHaveBeenCalledWith(mockSavedDocument.id, mockOwnerId);
      expect(result.estado).toBe(DocumentStatus.VALIDADO);
    });

    it('debe lanzar ConflictException si el comprobante ya existe', async () => {
      documentRepoMock.existsByNumero.mockResolvedValue(true);

      await expect(createUseCase.execute(mockDto, mockOwnerId)).rejects.toThrow(ConflictException);
      expect(documentRepoMock.save).not.toHaveBeenCalled();
    });

    it('debe canonizar el numero de factura antes de guardar', async () => {
      documentRepoMock.existsByNumero.mockResolvedValue(false);
      documentRepoMock.save.mockResolvedValue(mockSavedDocument);
      validateDocumentMock.execute.mockResolvedValue(mockSavedDocument);

      // Usamos un número con ceros a la izquierda diferentes
      const dtoWithWeirdNumber = { ...mockDto, numeroFactura: '001002000000123' };
      const expectedNormalized = '001-002-000000123';

      await createUseCase.execute(dtoWithWeirdNumber, mockOwnerId);

      expect(documentRepoMock.existsByNumero).toHaveBeenCalledWith(
        mockOwnerId,
        mockDto.rucEmisor,
        expectedNormalized,
      );
    });
  });

  describe('UpdateDocumentUseCase', () => {
    it('debe editar el comprobante y revalidarlo', async () => {
      const updateDto: IUpdateDocumentDto = { subtotal: 200, total: 224, iva: 24 };
      documentRepoMock.updateDocument.mockResolvedValue({
        ...mockSavedDocument,
        ...updateDto,
      });
      validateDocumentMock.execute.mockResolvedValue({
        ...mockSavedDocument,
        ...updateDto,
        estado: DocumentStatus.VALIDADO,
      });

      const result = await updateUseCase.execute(mockSavedDocument.id, mockOwnerId, updateDto);

      expect(documentRepoMock.updateDocument).toHaveBeenCalledWith(
        mockSavedDocument.id,
        mockOwnerId,
        updateDto,
      );
      expect(validateDocumentMock.execute).toHaveBeenCalledWith(mockSavedDocument.id, mockOwnerId);
      expect(result.estado).toBe(DocumentStatus.VALIDADO);
      expect(result.total).toBe(224);
    });

    it('debe lanzar NotFoundException si no encuentra el comprobante', async () => {
      documentRepoMock.updateDocument.mockResolvedValue(null);

      await expect(
        updateUseCase.execute('wrong-id', mockOwnerId, { subtotal: 10 }),
      ).rejects.toThrow(NotFoundException);
      expect(validateDocumentMock.execute).not.toHaveBeenCalled();
    });
  });
});
