import { InvoiceProcessingStatus } from '@sgc/shared';
import { ListImportErrorsUseCase } from './list-import-errors.use-case';
import { type IncomingInvoiceRepositoryPort } from '../../../domain/ports/incoming-invoice-repository.port';

describe('ListImportErrorsUseCase', () => {
  let useCase: ListImportErrorsUseCase;
  let invoiceRepoMock: jest.Mocked<IncomingInvoiceRepositoryPort>;

  const mockOwnerId = 'owner-123';
  const mockDate = new Date('2023-01-01T12:00:00Z');

  beforeEach(() => {
    invoiceRepoMock = {
      save: jest.fn(),
      findByOwnerAndEstado: jest.fn(),
      updateStatus: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<IncomingInvoiceRepositoryPort>;

    useCase = new ListImportErrorsUseCase(invoiceRepoMock);
  });

  it('debe mapear correctamente los errores devueltos por el repositorio', async () => {
    invoiceRepoMock.findByOwnerAndEstado.mockResolvedValue([
      {
        id: '1',
        ownerId: mockOwnerId,
        claveAcceso: 'CLAVE1',
        estado: InvoiceProcessingStatus.ERROR,
        errorMessage: 'SRI: CLAVE ACCESO REGISTRADA',
        updatedAt: mockDate,
      } as any,
      {
        id: '2',
        ownerId: mockOwnerId,
        claveAcceso: 'CLAVE2',
        estado: InvoiceProcessingStatus.ERROR,
        errorMessage: 'SCHEMA: Error de validacion XSD',
        updatedAt: mockDate,
      } as any,
    ]);

    const result = await useCase.execute(mockOwnerId);

    expect(invoiceRepoMock.findByOwnerAndEstado).toHaveBeenCalledWith(
      mockOwnerId,
      InvoiceProcessingStatus.ERROR,
    );

    expect(result).toHaveLength(2);
    
    // El primer error "SRI" no es retryable por defecto si es devuelta (isRetryable depende del prefijo)
    expect(result[0]).toEqual({
      claveAcceso: 'CLAVE1',
      errorMessage: 'SRI: CLAVE ACCESO REGISTRADA',
      fecha: mockDate.toISOString(),
      kind: 'other',
      retryable: false, // por defecto other no es retryable
    });

    expect(result[1]).toEqual({
      claveAcceso: 'CLAVE2',
      errorMessage: 'SCHEMA: Error de validacion XSD',
      fecha: mockDate.toISOString(),
      kind: 'other',
      retryable: false,
    });
  });
});
