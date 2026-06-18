import { Logger } from '@nestjs/common';
import { DocumentReceivedHandler } from './document-received.handler';

describe('DocumentReceivedHandler', () => {
  let handler: DocumentReceivedHandler;
  let storageMock: any;
  let emailRepoMock: any;
  let processSriXmlUseCaseMock: any;
  let configServiceMock: any;

  beforeEach(() => {
    storageMock = {
      uploadFile: jest.fn(),
    };
    emailRepoMock = {
      existsByMessageId: jest.fn(),
      save: jest.fn(),
    };
    processSriXmlUseCaseMock = {
      execute: jest.fn(),
    };
    configServiceMock = {
      getOrThrow: jest.fn().mockReturnValue('test-bucket'),
    };

    handler = new DocumentReceivedHandler(
      storageMock,
      emailRepoMock,
      processSriXmlUseCaseMock,
      configServiceMock,
    );

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const basePayload = {
    filename: 'test.xml',
    extension: 'xml',
    contentBase64: Buffer.from('<xml/>').toString('base64'),
    contentType: 'application/xml',
    size: 10,
    emailFrom: 'test@test.com',
    emailSubject: 'Test',
    emailDate: '2026-01-01T00:00:00Z',
    emailMessageId: 'msg1',
  };

  it('should ignore duplicate emails', async () => {
    emailRepoMock.existsByMessageId.mockResolvedValue(true);

    await handler.handleDocumentReceived(basePayload);

    expect(storageMock.uploadFile).not.toHaveBeenCalled();
    expect(emailRepoMock.save).not.toHaveBeenCalled();
  });

  it('should process new email, upload, save and process xml if extension is xml', async () => {
    emailRepoMock.existsByMessageId.mockResolvedValue(false);
    storageMock.uploadFile.mockResolvedValue({ bucket: 'b', key: 'k' });
    processSriXmlUseCaseMock.execute.mockResolvedValue({ success: true });

    await handler.handleDocumentReceived(basePayload);

    expect(storageMock.uploadFile).toHaveBeenCalled();
    expect(emailRepoMock.save).toHaveBeenCalled();
    expect(processSriXmlUseCaseMock.execute).toHaveBeenCalled();
  });

  it('should process new email, upload, save but NOT process xml if extension is pdf', async () => {
    emailRepoMock.existsByMessageId.mockResolvedValue(false);
    storageMock.uploadFile.mockResolvedValue({ bucket: 'b', key: 'k' });

    await handler.handleDocumentReceived({ ...basePayload, extension: 'pdf' });

    expect(storageMock.uploadFile).toHaveBeenCalled();
    expect(emailRepoMock.save).toHaveBeenCalled();
    expect(processSriXmlUseCaseMock.execute).not.toHaveBeenCalled();
  });

  it('should handle xml processing failure gracefully', async () => {
    emailRepoMock.existsByMessageId.mockResolvedValue(false);
    storageMock.uploadFile.mockResolvedValue({ bucket: 'b', key: 'k' });
    processSriXmlUseCaseMock.execute.mockResolvedValue({ success: false, errorMessage: 'Fail' });

    await handler.handleDocumentReceived(basePayload);

    // It still uploaded and saved
    expect(storageMock.uploadFile).toHaveBeenCalled();
    expect(emailRepoMock.save).toHaveBeenCalled();
    expect(processSriXmlUseCaseMock.execute).toHaveBeenCalled();
  });

  it('should catch errors and log them without crashing', async () => {
    emailRepoMock.existsByMessageId.mockRejectedValue(new Error('DB connection lost'));

    await expect(handler.handleDocumentReceived(basePayload)).resolves.toBeUndefined();
  });
});
