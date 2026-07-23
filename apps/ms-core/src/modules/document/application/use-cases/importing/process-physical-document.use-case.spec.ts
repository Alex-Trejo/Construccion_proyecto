import { ConfigService } from '@nestjs/config';
import { ProcessPhysicalDocumentUseCase } from './process-physical-document.use-case';
import { type ObjectStoragePort } from '../../../../communication/domain/ports/object-storage.port';
import { type OcrPort } from '../../../domain/ports/ocr.port';

describe('ProcessPhysicalDocumentUseCase', () => {
  let useCase: ProcessPhysicalDocumentUseCase;
  let storageMock: jest.Mocked<ObjectStoragePort>;
  let ocrMock: jest.Mocked<OcrPort>;
  let configMock: jest.Mocked<ConfigService>;

  const mockOwnerId = 'owner-123';
  const mockFile = {
    content: Buffer.from('fake-image-data'),
    filename: 'factura_123.png',
    contentType: 'image/png',
  };

  beforeEach(() => {
    storageMock = {
      uploadFile: jest.fn(),
      getPresignedUrl: jest.fn(),
    } as unknown as jest.Mocked<ObjectStoragePort>;

    ocrMock = {
      extractFromImage: jest.fn(),
    } as unknown as jest.Mocked<OcrPort>;

    configMock = {
      getOrThrow: jest.fn().mockReturnValue('test-bucket'),
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    useCase = new ProcessPhysicalDocumentUseCase(storageMock, ocrMock, configMock);
  });

  it('debe subir a minio y llamar al OCR con base64', async () => {
    const ocrResult = {
      data: {
        rucEmisor: '1712345678001',
        numeroFactura: '001-002-123',
        // ... otros campos mock
      },
      confidenceScore: 0.95,
      storageKey: 'mock-key',
    } as any;

    ocrMock.extractFromImage.mockResolvedValue(ocrResult);

    const result = await useCase.execute(mockFile, mockOwnerId);

    // Verificar subida a MinIO
    expect(storageMock.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: 'test-bucket',
        contentType: 'image/png',
        content: mockFile.content,
      }),
    );
    
    // El key se genera con randomUUID, no podemos predecirlo exacto, pero sí parte de él
    const uploadedKey = (storageMock.uploadFile.mock.calls[0][0] as any).key;
    expect(uploadedKey).toContain('documents/owner-123/');
    expect(uploadedKey).toContain('factura_123.png');

    // Verificar llamada OCR
    expect(ocrMock.extractFromImage).toHaveBeenCalledWith(
      mockFile.content,
      mockFile.contentType,
      uploadedKey,
    );

    expect(result).toBe(ocrResult);
  });
});
