import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeleteSupplierUseCase } from '../mutations/delete-supplier.use-case';
import { SUPPLIER_REPOSITORY_PORT } from '../../../domain/ports/supplier-repository.port';

describe('DeleteSupplierUseCase', () => {
  let useCase: DeleteSupplierUseCase;

  const mockRepo = {
    findById: jest.fn(),
    deactivate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteSupplierUseCase,
        { provide: SUPPLIER_REPOSITORY_PORT, useValue: mockRepo },
      ],
    }).compile();

    useCase = module.get<DeleteSupplierUseCase>(DeleteSupplierUseCase);
  });

  it('should throw NotFoundException if supplier not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('1', 'owner1')).rejects.toThrow(NotFoundException);
  });

  it('should deactivate supplier and return deleted id', async () => {
    mockRepo.findById.mockResolvedValue({ id: '1' });
    mockRepo.deactivate.mockResolvedValue(undefined);
    
    const res = await useCase.execute('1', 'owner1');
    expect(mockRepo.deactivate).toHaveBeenCalledWith('1', 'owner1');
    expect(res).toEqual({ deleted: '1' });
  });
});
