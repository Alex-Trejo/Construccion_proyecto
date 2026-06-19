import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailSyncCronService } from './email-sync-cron.service';
import { EmailProcessorService } from './email-processor.service';
import { of } from 'rxjs';

jest.mock('../../common/crypto.util', () => ({
  decryptSecret: jest.fn().mockReturnValue('decrypted_password'),
}));

describe('EmailSyncCronService', () => {
  let cronService: EmailSyncCronService;
  let imapClientMock: any;
  let emailProcessorMock: any;
  let configServiceMock: any;
  let msCoreClientMock: any;

  beforeEach(() => {
    imapClientMock = {
      fetchUnseenWithAttachments: jest.fn(),
    };
    emailProcessorMock = {
      processEmails: jest.fn(),
    };
    configServiceMock = {
      getOrThrow: jest.fn().mockReturnValue(1),
    };
    msCoreClientMock = {
      send: jest.fn().mockReturnValue(of([{
        host: 'imap.test.com',
        port: 993,
        email: 'test@test.com',
        passwordEncrypted: 'encrypted',
        tls: true,
        ownerId: '123',
      }])),
    };

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});

    cronService = new EmailSyncCronService(
      imapClientMock,
      msCoreClientMock,
      emailProcessorMock,
      configServiceMock,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should skip sync if cycle is active', async () => {
    (cronService as any).isSyncing = true;
    await cronService.runSync();
    expect(imapClientMock.fetchUnseenWithAttachments).not.toHaveBeenCalled();
  });

  it('should process emails successfully when available', async () => {
    const mockEmails = [{ id: '1' }, { id: '2' }];
    imapClientMock.fetchUnseenWithAttachments.mockResolvedValue(mockEmails);
    emailProcessorMock.processEmails.mockResolvedValue({
      totalEmails: 2,
      totalAttachments: 2,
      eventsEmitted: 2,
      eventsFailed: 0,
    });

    await cronService.runSync();

    expect(imapClientMock.fetchUnseenWithAttachments).toHaveBeenCalled();
    expect(emailProcessorMock.processEmails).toHaveBeenCalledWith(mockEmails, '123');
  });

  it('should not process if no emails are found', async () => {
    imapClientMock.fetchUnseenWithAttachments.mockResolvedValue([]);

    await cronService.runSync();

    expect(imapClientMock.fetchUnseenWithAttachments).toHaveBeenCalled();
    expect(emailProcessorMock.processEmails).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully without throwing', async () => {
    imapClientMock.fetchUnseenWithAttachments.mockRejectedValue(new Error('IMAP connection failed'));

    await expect(cronService.runSync()).resolves.toBeUndefined();

    expect(imapClientMock.fetchUnseenWithAttachments).toHaveBeenCalled();
    expect(emailProcessorMock.processEmails).not.toHaveBeenCalled();
  });
});
