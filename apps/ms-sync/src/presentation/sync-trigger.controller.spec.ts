import { Test, TestingModule } from '@nestjs/testing';
import { SyncTriggerController } from './sync-trigger.controller';
import { EmailSyncCronService } from '../application/services/email-sync-cron.service';
import { SYNC_PATTERNS } from '@sgc/shared';

describe('SyncTriggerController', () => {
  let controller: SyncTriggerController;
  let syncCronMock: jest.Mocked<EmailSyncCronService>;

  beforeEach(async () => {
    syncCronMock = {
      runSync: jest.fn(),
    } as unknown as jest.Mocked<EmailSyncCronService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncTriggerController],
      providers: [
        {
          provide: EmailSyncCronService,
          useValue: syncCronMock,
        },
      ],
    }).compile();

    controller = module.get<SyncTriggerController>(SyncTriggerController);
  });

  describe('trigger', () => {
    it('debe llamar a runSync del cron service y devolver resultado', async () => {
      const mockResult = { processedAccounts: 1, processedEmails: 2, emittedEvents: 3 };
      syncCronMock.runSync.mockResolvedValue(mockResult);

      const result = await controller.trigger();

      expect(syncCronMock.runSync).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });
});
