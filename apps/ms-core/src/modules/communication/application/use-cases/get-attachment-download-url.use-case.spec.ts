import { Logger } from '@nestjs/common';
import { GetAttachmentDownloadUrlUseCase } from './get-attachment-download-url.use-case';

describe('GetAttachmentDownloadUrlUseCase', () => {
  let useCase: GetAttachmentDownloadUrlUseCase;
  let emailRepoMock: any;
  let storageMock: any;

  beforeEach(() => {
    emailRepoMock = {
      findById: jest.fn(),
    };
    storageMock = {
      getPresignedUrl: jest.fn(),
    };

    useCase = new GetAttachmentDownloadUrlUseCase(emailRepoMock, storageMock);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return null if email is not found', async () => {
    emailRepoMock.findById.mockResolvedValue(null);

    const result = await useCase.execute('email-1', 'att-1');

    expect(result).toBeNull();
    expect(emailRepoMock.findById).toHaveBeenCalledWith('email-1', undefined);
  });

  it('should return null if attachment is not found in email', async () => {
    const mockEmail = {
      id: 'email-1',
      attachments: [{ id: 'att-2' }],
    };
    emailRepoMock.findById.mockResolvedValue(mockEmail);

    const result = await useCase.execute('email-1', 'att-1');

    expect(result).toBeNull();
  });

  it('should return presigned URL result if successful', async () => {
    const mockAttachment = {
      id: 'att-1',
      storageBucket: 'test-bucket',
      storageKey: 'test-key.pdf',
      filename: 'test.pdf',
      contentType: 'application/pdf',
      size: 1024,
    };
    const mockEmail = {
      id: 'email-1',
      attachments: [mockAttachment],
    };

    emailRepoMock.findById.mockResolvedValue(mockEmail);
    storageMock.getPresignedUrl.mockResolvedValue('https://signed-url.com');

    const result = await useCase.execute('email-1', 'att-1');

    expect(result).toEqual({
      url: 'https://signed-url.com',
      filename: 'test.pdf',
      contentType: 'application/pdf',
      size: 1024,
      expiresInSeconds: 300,
    });
    expect(storageMock.getPresignedUrl).toHaveBeenCalledWith('test-bucket', 'test-key.pdf', 300);
  });
});
