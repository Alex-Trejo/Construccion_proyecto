import { ConfigService } from '@nestjs/config';
import { PersistParsedDocumentUseCase } from './persist-parsed-document.use-case';
import { type DocumentRepositoryPort } from '../../../domain/ports/document-repository.port';
import { type ObjectStoragePort } from '../../../../communication/domain/ports/object-storage.port';
import { RidePdfGenerator } from '../../../infrastructure/adapters/ride-pdf.generator';
import { ValidateDocumentUseCase } from '../validations/validate-document.use-case';
import { AutoProvisionEntitiesUseCase } from '../processing/auto-provision-entities.use-case';

describe('PersistParsedDocumentUseCase', () => {
  let useCase: PersistParsedDocumentUseCase;
  let documentRepoMock: jest.Mocked<DocumentRepositoryPort>;
  let storageMock: jest.Mocked<ObjectStoragePort>;
  let ridePdfMock: jest.Mocked<RidePdfGenerator>;
  let validateMock: jest.Mocked<ValidateDocumentUseCase>;
  let autoProvisionMock: jest.Mocked<AutoProvisionEntitiesUseCase>;
  let configMock: jest.Mocked<ConfigService>;

  const mockOwnerId = 'owner-123';
  const mockParsed = {
    documentType: '01',
    issuerTaxId: '1712345678001',
    issuerName: 'Emisor',
    serialNumber: '001-002-123',
    accessKey: 'CLAVE123',
    issueDate: '01/01/2023',
    subtotal: 100,
    taxAmount: 12,
    totalAmount: 112,
    items: [
      {
        description: 'Item',
        quantity: 1,
        unitPrice: 100,
        discount: 0,
        totalPrice: 100,
      }
    ],
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
      findForExport: jest.fn(),
      getStorageRef: jest.fn(),
    } as unknown as jest.Mocked<DocumentRepositoryPort>;

    storageMock = {
      uploadFile: jest.fn(),
      getPresignedUrl: jest.fn(),
    } as unknown as jest.Mocked<ObjectStoragePort>;

    ridePdfMock = {
      generate: jest.fn(),
    } as unknown as jest.Mocked<RidePdfGenerator>;

    validateMock = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ValidateDocumentUseCase>;

    autoProvisionMock = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AutoProvisionEntitiesUseCase>;

    configMock = {
      getOrThrow: jest.fn().mockReturnValue('test-bucket'),
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    useCase = new PersistParsedDocumentUseCase(
      documentRepoMock,
      storageMock,
      ridePdfMock,
      validateMock,
      autoProvisionMock,
      configMock,
    );
  });

  it('debe persistir, generar RIDE, validar y auto-provisionar', async () => {
    documentRepoMock.existsByNumero.mockResolvedValue(false);
    ridePdfMock.generate.mockResolvedValue(Buffer.from('pdf'));
    documentRepoMock.save.mockResolvedValue({ id: 'doc-123' } as any);

    const result = await useCase.execute(mockParsed, '<xml></xml>', mockOwnerId);

    expect(result).toBe(true);
    expect(documentRepoMock.save).toHaveBeenCalled();
    expect(ridePdfMock.generate).toHaveBeenCalled();
    expect(storageMock.uploadFile).toHaveBeenCalled();
    expect(validateMock.execute).toHaveBeenCalledWith('doc-123', mockOwnerId);
    expect(autoProvisionMock.execute).toHaveBeenCalledWith(mockParsed, mockOwnerId);
  });

  it('debe retornar false si el comprobante ya existe', async () => {
    documentRepoMock.existsByNumero.mockResolvedValue(true);

    const result = await useCase.execute(mockParsed, '<xml></xml>', mockOwnerId);

    expect(result).toBe(false);
    expect(documentRepoMock.save).not.toHaveBeenCalled();
    expect(ridePdfMock.generate).not.toHaveBeenCalled();
  });
});
