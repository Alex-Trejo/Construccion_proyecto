import { FindAllSuppliersUseCase } from './find-all-suppliers.use-case';

describe('FindAllSuppliersUseCase', () => {
  let useCase: FindAllSuppliersUseCase;
  let supplierRepoMock: any;

  beforeEach(() => {
    supplierRepoMock = {
      findAll: jest.fn(),
    };
    useCase = new FindAllSuppliersUseCase(supplierRepoMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return a list of suppliers', async () => {
    const mockSuppliers = [{ id: '1' }, { id: '2' }];
    supplierRepoMock.findAll.mockResolvedValue(mockSuppliers);

    const result = await useCase.execute();

    expect(result).toEqual(mockSuppliers);
    expect(supplierRepoMock.findAll).toHaveBeenCalledTimes(1);
  });

  it('should return empty list if no suppliers exist', async () => {
    supplierRepoMock.findAll.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
    expect(supplierRepoMock.findAll).toHaveBeenCalledTimes(1);
  });
});
