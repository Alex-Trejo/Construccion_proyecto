import { Logger } from '@nestjs/common';
import { AutoProvisionEntitiesUseCase } from '../processing/auto-provision-entities.use-case';
import { SupplierType } from '@sgc/shared';
import { Ruc } from '../../../../supplier/domain/value-objects/ruc.vo';

jest.mock('../../../../supplier/domain/value-objects/ruc.vo', () => ({
  Ruc: {
    create: jest.fn().mockImplementation((val) => ({ 
      value: val, 
      isCedula: val.length === 10, 
      isRuc: val.length === 13 
    })),
  },
}));

describe('AutoProvisionEntitiesUseCase', () => {
  let useCase: AutoProvisionEntitiesUseCase;
  let sriRestApiMock: any;
  let supplierRepoMock: any;
  let companyRepoMock: any;

  beforeEach(() => {
    sriRestApiMock = {
      fetchContributorByRuc: jest.fn(),
    };
    supplierRepoMock = {
      findByTaxId: jest.fn(),
      save: jest.fn(),
    };
    companyRepoMock = {
      existsByTaxId: jest.fn(),
      save: jest.fn(),
    };

    useCase = new AutoProvisionEntitiesUseCase(sriRestApiMock, supplierRepoMock, companyRepoMock);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const parsedDoc = {
    issuerTaxId: '1791251237001',
    buyerTaxId: '1791251237002',
  } as any;

  it('should auto-provision natural supplier and company', async () => {
    supplierRepoMock.findByTaxId.mockResolvedValue(null);
    sriRestApiMock.fetchContributorByRuc.mockResolvedValueOnce({
      ruc: '1791251237001',
      razonSocial: 'PEREZ GOMEZ JUAN PABLO',
      tipoContribuyente: 'PERSONA_NATURAL',
      direccionMatriz: 'Dir 1',
    });

    companyRepoMock.existsByTaxId.mockResolvedValue(false);
    sriRestApiMock.fetchContributorByRuc.mockResolvedValueOnce({
      ruc: '1791251237002',
      razonSocial: 'CIA LTDA',
      direccionMatriz: 'Dir 2',
      obligadoLlevarContabilidad: true,
    });

    const result = await useCase.execute(parsedDoc);

    expect(result.supplierCreated).toBe(true);
    expect(result.supplierRuc).toBe('1791251237001');
    expect(result.companyCreated).toBe(true);
    expect(supplierRepoMock.save).toHaveBeenCalled();
    expect(companyRepoMock.save).toHaveBeenCalled();
  });

  it('should not provision if entities already exist', async () => {
    supplierRepoMock.findByTaxId.mockResolvedValue({ getDisplayName: () => 'Test' });
    companyRepoMock.existsByTaxId.mockResolvedValue(true);

    const result = await useCase.execute(parsedDoc);

    expect(result.supplierCreated).toBe(false);
    expect(result.companyCreated).toBe(false);
    expect(sriRestApiMock.fetchContributorByRuc).not.toHaveBeenCalled();
  });

  it('should not provision company if ruc is invalid', async () => {
    supplierRepoMock.findByTaxId.mockResolvedValue({ getDisplayName: () => 'Test' });
    const RucModule = require('../../../../supplier/domain/value-objects/ruc.vo');
    RucModule.Ruc.create.mockImplementationOnce(() => {
      throw new Error('Invalid');
    });

    const result = await useCase.execute(parsedDoc);

    expect(result.companyCreated).toBe(false);
    expect(companyRepoMock.existsByTaxId).not.toHaveBeenCalled();
  });
});
