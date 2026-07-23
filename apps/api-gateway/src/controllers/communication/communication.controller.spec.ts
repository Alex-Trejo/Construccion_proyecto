import { Test, type TestingModule } from '@nestjs/testing';
import { CommunicationController } from './communication.controller';
import { ClientProxy } from '@nestjs/microservices';
import { MICROSERVICE_TOKENS, COMMUNICATION_PATTERNS } from '@sgc/shared';
import { of } from 'rxjs';
import { NotFoundException } from '@nestjs/common';
import type { Response } from 'express';

describe('CommunicationController', () => {
  let controller: CommunicationController;
  let clientProxy: jest.Mocked<ClientProxy>;

  const mockUser = { id: 'user1', email: 'test@test.com', name: 'Test', roles: ['admin'] };
  
  beforeEach(async () => {
    clientProxy = {
      send: jest.fn(),
    } as unknown as jest.Mocked<ClientProxy>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommunicationController],
      providers: [
        {
          provide: MICROSERVICE_TOKENS.MS_CORE_CLIENT,
          useValue: clientProxy,
        },
      ],
    }).compile();

    controller = module.get<CommunicationController>(CommunicationController);
    
    // Mock global fetch
    global.fetch = jest.fn();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listEmails', () => {
    it('should return list of emails', async () => {
      clientProxy.send.mockReturnValue(of({ items: [], total: 0 }));
      const result = await controller.listEmails(mockUser as any, 1, 10);
      expect(result).toEqual({ items: [], total: 0 });
      expect(clientProxy.send).toHaveBeenCalledWith(
        COMMUNICATION_PATTERNS.LIST_EMAILS,
        expect.objectContaining({ data: { page: 1, limit: 10 } })
      );
    });
  });

  describe('getEmailDetail', () => {
    it('should return email detail', async () => {
      clientProxy.send.mockReturnValue(of({ id: 'email1' }));
      const result = await controller.getEmailDetail(mockUser as any, 'email1');
      expect(result).toEqual({ id: 'email1' });
    });

    it('should throw NotFoundException if not found', async () => {
      clientProxy.send.mockReturnValue(of(null));
      await expect(controller.getEmailDetail(mockUser as any, 'email1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAttachmentDownloadUrl', () => {
    it('should return download url', async () => {
      clientProxy.send.mockReturnValue(of({ url: 'http://test' }));
      const result = await controller.getAttachmentDownloadUrl(mockUser as any, 'email1', 'att1');
      expect(result).toEqual({ url: 'http://test' });
    });

    it('should throw NotFoundException if not found', async () => {
      clientProxy.send.mockReturnValue(of(null));
      await expect(controller.getAttachmentDownloadUrl(mockUser as any, 'email1', 'att1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('streamAttachment', () => {
    it('should stream attachment from upstream', async () => {
      clientProxy.send.mockReturnValue(of({ url: 'http://test', filename: 'test.pdf', contentType: 'application/pdf' }));
      
      const mockBuffer = new ArrayBuffer(8);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockBuffer),
      });

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.streamAttachment(mockUser as any, 'email1', 'att1', mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="test.pdf"');
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should throw NotFoundException if attachment metadata not found', async () => {
      clientProxy.send.mockReturnValue(of(null));
      await expect(controller.streamAttachment(mockUser as any, 'email1', 'att1', {} as Response)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if upstream fetch fails', async () => {
      clientProxy.send.mockReturnValue(of({ url: 'http://test', filename: 'test.pdf', contentType: 'application/pdf' }));
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      });

      await expect(controller.streamAttachment(mockUser as any, 'email1', 'att1', {} as Response)).rejects.toThrow(NotFoundException);
    });
  });
});
