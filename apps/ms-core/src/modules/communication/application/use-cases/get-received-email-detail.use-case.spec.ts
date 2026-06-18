import { Logger } from '@nestjs/common';
import { GetReceivedEmailDetailUseCase } from './get-received-email-detail.use-case';

describe('GetReceivedEmailDetailUseCase', () => {
  let useCase: GetReceivedEmailDetailUseCase;
  let emailRepoMock: any;

  beforeEach(() => {
    emailRepoMock = {
      findById: jest.fn(),
    };
    useCase = new GetReceivedEmailDetailUseCase(emailRepoMock);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return email detail', async () => {
    const mockEmail = { id: 'email-1', subject: 'Test' };
    emailRepoMock.findById.mockResolvedValue(mockEmail);

    const result = await useCase.execute('email-1');

    expect(result).toEqual(mockEmail);
    expect(emailRepoMock.findById).toHaveBeenCalledWith('email-1');
  });

  it('should return null if email not found', async () => {
    emailRepoMock.findById.mockResolvedValue(null);

    const result = await useCase.execute('email-1');

    expect(result).toBeNull();
  });
});
