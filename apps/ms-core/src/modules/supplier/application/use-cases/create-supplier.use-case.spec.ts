import { ConflictException, Logger } from '@nestjs/common';
import { SupplierType } from '@sgc/shared';
import { CreateSupplierUseCase } from './create-supplier.use-case';
import { SupplierFactory } from '../../domain/factories/supplier.factory';

describe('CreateSupplierUseCase', () => {
  let useCase: CreateSupplierUseCase;
  let supplierRepoMock: any;

  beforeEach(() => {
    supplierRepoMock = {
      existsByTaxId: jest.fn(),
      save: jest.fn(),
    };
    useCase = new CreateSupplierUseCase(supplierRepoMock);
    // Mock logger to avoid console spam
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw ConflictException if supplier already exists', async () => {
    supplierRepoMock.existsByTaxId.mockResolvedValue(true);

    await expect(
      useCase.execute({
        supplierType: SupplierType.PERSONA_NATURAL,
        taxId: '1700000000',
        email: 'test@test.com',
        phone: '123',
        address: '123',
        firstName: 'John',
        lastName: 'Doe',
        cedula: '1700000000',
      }, 'owner-1')
    ).rejects.toThrow(ConflictException);

    expect(supplierRepoMock.existsByTaxId).toHaveBeenCalledWith('1700000000', 'owner-1');
    expect(supplierRepoMock.save).not.toHaveBeenCalled();
  });

  it('should create and save a new supplier successfully', async () => {
    supplierRepoMock.existsByTaxId.mockResolvedValue(false);

    const dto = {
      supplierType: SupplierType.PERSONA_JURIDICA,
      taxId: '1790000000001',
      email: 'corp@test.com',
      phone: '099999',
      address: 'UIO',
      businessName: 'Corp SA',
      tradeName: 'Corp',
      legalRepresentative: 'Jane Doe',
    };

    const mockSupplier = {
      ruc: { value: '1790000000001' },
      getDisplayName: () => 'Corp SA',
    };
    
    jest.spyOn(SupplierFactory, 'create').mockReturnValue(mockSupplier as any);
    supplierRepoMock.save.mockResolvedValue(mockSupplier);

    const result = await useCase.execute(dto as any, 'owner-1');

    expect(result).toBeDefined();
    expect(result.ruc.value).toBe('1790000000001');
    expect(supplierRepoMock.existsByTaxId).toHaveBeenCalledWith('1790000000001', 'owner-1');
    expect(supplierRepoMock.save).toHaveBeenCalled();
  });
});
