import { NotFoundException } from '@nestjs/common';
import { SupplierType } from '@sgc/shared';
import { FindSupplierByIdUseCase } from '../queries/find-supplier-by-id.use-case';
import { type SupplierRepositoryPort } from '../../../domain/ports/supplier-repository.port';
import { PersonaNaturalSupplier } from '../../../domain/entities/persona-natural-supplier.entity';

describe('FindSupplierByIdUseCase', () => {
  let useCase: FindSupplierByIdUseCase;
  let supplierRepoMock: jest.Mocked<SupplierRepositoryPort>;

  const mockOwnerId = 'owner-123';
  const mockSupplierId = 'supp-123';

  const mockSupplier = new PersonaNaturalSupplier({
    id: mockSupplierId,
    ownerId: mockOwnerId,
    supplierCode: 'P-123',
    ruc: '1712345678001',
    supplierType: SupplierType.PERSONA_NATURAL,
    email: 'test@test.com',
    phone: '0999999999',
    address: 'Quito',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    firstName: 'Juan',
    lastName: 'Pérez',
    cedula: '1712345678',
  });

  beforeEach(() => {
    supplierRepoMock = {
      findById: jest.fn(),
      findByRuc: jest.fn(),
      findByCode: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<SupplierRepositoryPort>;

    useCase = new FindSupplierByIdUseCase(supplierRepoMock);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('debe retornar el proveedor si existe', async () => {
      supplierRepoMock.findById.mockResolvedValue(mockSupplier);

      const result = await useCase.execute(mockSupplierId, mockOwnerId);

      expect(supplierRepoMock.findById).toHaveBeenCalledWith(
        mockSupplierId,
        mockOwnerId,
      );
      expect(result).toBe(mockSupplier);
    });

    it('debe lanzar NotFoundException si el proveedor no existe', async () => {
      supplierRepoMock.findById.mockResolvedValue(null);

      await expect(
        useCase.execute(mockSupplierId, mockOwnerId),
      ).rejects.toThrow(NotFoundException);
      expect(supplierRepoMock.findById).toHaveBeenCalledWith(
        mockSupplierId,
        mockOwnerId,
      );
    });
  });
});
