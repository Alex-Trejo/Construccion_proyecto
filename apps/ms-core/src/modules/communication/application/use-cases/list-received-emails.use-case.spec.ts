import { Logger } from '@nestjs/common';
import { ListReceivedEmailsUseCase } from './list-received-emails.use-case';

describe('ListReceivedEmailsUseCase', () => {
  let useCase: ListReceivedEmailsUseCase;
  let emailRepoMock: any;

  beforeEach(() => {
    emailRepoMock = {
      findPaginated: jest.fn(),
    };
    useCase = new ListReceivedEmailsUseCase(emailRepoMock);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return paginated emails', async () => {
    const mockPaginationParams = { page: 1, limit: 10 };
    const mockResult = { items: [{ id: '1' }], total: 1 };
    
    emailRepoMock.findPaginated.mockResolvedValue(mockResult);

    const result = await useCase.execute(mockPaginationParams);

    expect(result).toEqual(mockResult);
    expect(emailRepoMock.findPaginated).toHaveBeenCalledWith(mockPaginationParams);
  });
});
