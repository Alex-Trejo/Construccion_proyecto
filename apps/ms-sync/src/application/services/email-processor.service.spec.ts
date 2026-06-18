import { Test, TestingModule } from '@nestjs/testing';
import { EmailProcessorService } from './email-processor.service';
import { MICROSERVICE_TOKENS } from '@sgc/shared';
import { Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('EmailProcessorService', () => {
  let service: EmailProcessorService;
  let clientProxyMock: any;

  beforeEach(async () => {
    clientProxyMock = {
      connect: jest.fn(),
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProcessorService,
        {
          provide: MICROSERVICE_TOKENS.MS_CORE_CLIENT,
          useValue: clientProxyMock,
        },
      ],
    }).compile();

    service = module.get<EmailProcessorService>(EmailProcessorService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should connect to ms-core', async () => {
      clientProxyMock.connect.mockResolvedValue(undefined);
      await service.onModuleInit();
      expect(clientProxyMock.connect).toHaveBeenCalled();
    });

    it('should handle connection errors gracefully', async () => {
      clientProxyMock.connect.mockRejectedValue(new Error('Connection failed'));
      await service.onModuleInit();
      expect(clientProxyMock.connect).toHaveBeenCalled();
    });
  });

  describe('processEmails', () => {
    const mockDate = new Date();
    const mockEmails = [
      {
        metadata: {
          from: 'test@test.com',
          subject: 'Test subject',
          date: mockDate,
          messageId: 'msg1',
        },
        attachments: [
          {
            filename: 'test.pdf',
            extension: 'pdf',
            content: Buffer.from('test'),
            contentType: 'application/pdf',
            size: 4,
          },
        ],
      },
    ];

    it('should process emails and emit events successfully', async () => {
      clientProxyMock.emit.mockReturnValue(of(null));

      const result = await service.processEmails(mockEmails as any);

      expect(result).toEqual({
        totalEmails: 1,
        totalAttachments: 1,
        eventsEmitted: 1,
        eventsFailed: 0,
      });
      expect(clientProxyMock.emit).toHaveBeenCalledTimes(1);
    });

    it('should handle emit errors and count as failed', async () => {
      clientProxyMock.emit.mockReturnValue(throwError(() => new Error('Emit failed')));

      const result = await service.processEmails(mockEmails as any);

      expect(result).toEqual({
        totalEmails: 1,
        totalAttachments: 1,
        eventsEmitted: 0,
        eventsFailed: 1,
      });
      expect(clientProxyMock.emit).toHaveBeenCalledTimes(1);
    });
  });
});
