import { Logger } from '@nestjs/common';
import { ProcessTxtBatchUseCase } from '../importing/process-txt-batch.use-case';
import { IncomingInvoice } from '../../../domain/entities/incoming-invoice.entity';

describe('ProcessTxtBatchUseCase', () => {
  let useCase: ProcessTxtBatchUseCase;
  let invoiceRepoMock: any;

  beforeEach(() => {
    invoiceRepoMock = {
      existsByClaveAcceso: jest.fn(),
      saveBatch: jest.fn(),
    };
    useCase = new ProcessTxtBatchUseCase(invoiceRepoMock);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should process txt and extract valid keys, skipping duplicates', async () => {
    const validKey1 = '1'.repeat(49);
    const validKey2 = '2'.repeat(49);
    const invalidKey = '123'; // too short
    const txtContent = `${validKey1}\n${validKey1}\n${validKey2}\n${invalidKey}`;

    // Mock isValidAccessKey
    jest.spyOn(IncomingInvoice, 'isValidAccessKey').mockImplementation((key: string) => key.length === 49);

    // validKey1 exists in BD, validKey2 does not
    invoiceRepoMock.existsByClaveAcceso.mockImplementation(async (key: string) => key === validKey1);
    
    invoiceRepoMock.saveBatch.mockResolvedValue(undefined);

    const result = await useCase.execute(txtContent);

    expect(result).toEqual({
      totalKeysFound: 3, // validKey1, validKey1, validKey2
      newKeysRegistered: 1, // only validKey2
      duplicatesSkipped: 1, // validKey1
      invalidKeysSkipped: 0, // regex doesn't even extract invalidKey
      invalidKeys: [],
    });

    expect(invoiceRepoMock.saveBatch).toHaveBeenCalledTimes(1);
    expect(invoiceRepoMock.saveBatch.mock.calls[0][0][0].claveAcceso).toBe(validKey2);
  });

  it('should not call saveBatch if no new valid keys are found', async () => {
    const txtContent = 'no valid keys here';
    
    const result = await useCase.execute(txtContent);

    expect(result.newKeysRegistered).toBe(0);
    expect(invoiceRepoMock.saveBatch).not.toHaveBeenCalled();
  });
});
