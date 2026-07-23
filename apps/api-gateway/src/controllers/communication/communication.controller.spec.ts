import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationController } from './communication.controller';
import { MICROSERVICE_TOKENS } from '@sgc/shared';
import { of } from 'rxjs';
import { NotFoundException } from '@nestjs/common';

describe('CommunicationController', () => {
  let controller: CommunicationController;
  let clientProxyMock: any;

  beforeEach(async () => {
    clientProxyMock = {
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommunicationController],
      providers: [
        {
          provide: MICROSERVICE_TOKENS.MS_CORE_CLIENT,
          useValue: clientProxyMock,
        },
      ],
    }).compile();

    controller = module.get<CommunicationController>(CommunicationController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listEmails', () => {
    it('should send LIST_EMAILS pattern to ms-core', async () => {
      const mockResult = { items: [], total: 0 };
      clientProxyMock.send.mockReturnValue(of(mockResult));

      const mockUser = { userId: '123' } as any;
      const result = await controller.listEmails(1, 10, mockUser);

      expect(result).toEqual(mockResult);
      expect(clientProxyMock.send).toHaveBeenCalled();
    });
  });

  describe('getEmailDetail', () => {
    it('should send GET_EMAIL_DETAIL pattern and return result', async () => {
      const mockResult = { id: '1', subject: 'Test' };
      clientProxyMock.send.mockReturnValue(of(mockResult));

      const mockUser = { userId: '123' } as any;
      const result = await controller.getEmailDetail('1', mockUser);

      expect(result).toEqual(mockResult);
    });

    it('should throw NotFoundException if not found', async () => {
      clientProxyMock.send.mockReturnValue(of(null));

      const mockUser = { userId: '123' } as any;
      await expect(controller.getEmailDetail('1', mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAttachmentDownloadUrl', () => {
    it('should return url if attachment exists', async () => {
      const mockResult = { url: 'http://minio/download' };
      clientProxyMock.send.mockReturnValue(of(mockResult));

      const mockUser = { userId: '123' } as any;
      const result = await controller.getAttachmentDownloadUrl('1', 'a1', mockUser);

      expect(result).toEqual(mockResult);
    });

    it('should throw NotFoundException if attachment url not returned', async () => {
      clientProxyMock.send.mockReturnValue(of(null));

      const mockUser = { userId: '123' } as any;
      await expect(controller.getAttachmentDownloadUrl('1', 'a1', mockUser)).rejects.toThrow(NotFoundException);
    });
  });
});
