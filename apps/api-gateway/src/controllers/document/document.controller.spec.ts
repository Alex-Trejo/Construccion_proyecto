import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import { DocumentController } from './document.controller';
import { MICROSERVICE_TOKENS, DOCUMENT_PATTERNS } from '@sgc/shared';
import { of } from 'rxjs';
import { BadRequestException } from '@nestjs/common';
import type { Response } from 'express';

describe('DocumentController', () => {
  let controller: DocumentController;
  let msCoreMock: jest.Mocked<ClientProxy>;

  const mockUser = {
    userId: 'user-123',
    username: 'test',
    email: 'test@test.com',
    roles: ['Administrador'],
  } as any;

  beforeEach(async () => {
    msCoreMock = {
      send: jest.fn(),
      emit: jest.fn(),
    } as unknown as jest.Mocked<ClientProxy>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentController],
      providers: [
        {
          provide: MICROSERVICE_TOKENS.MS_CORE_CLIENT,
          useValue: msCoreMock,
        },
      ],
    }).compile();

    controller = module.get<DocumentController>(DocumentController);
  });

  describe('physical', () => {
    it('debe lanzar error si no hay archivo', async () => {
      await expect(controller.physical(undefined, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('debe enviar archivo al ms-core', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
      } as any;

      msCoreMock.send.mockReturnValue(of({ data: 'ok' }));

      const result = await controller.physical(mockFile, mockUser);

      expect(msCoreMock.send).toHaveBeenCalledWith(
        DOCUMENT_PATTERNS.PROCESS_PHYSICAL,
        expect.objectContaining({
          data: {
            contentBase64: 'dGVzdA==', // 'test' in base64
            filename: 'test.jpg',
            contentType: 'image/jpeg',
          },
          metadata: expect.objectContaining({ userId: 'user-123' })
        })
      );
      expect(result).toEqual({ data: 'ok' });
    });
  });

  describe('bulkTxt', () => {
    it('debe enviar batch txt al ms-core', async () => {
      const mockFile = {
        buffer: Buffer.from('test txt'),
      } as any;

      msCoreMock.send.mockReturnValue(of({ status: 'ok' }));

      await controller.bulkTxt(mockFile, mockUser);

      expect(msCoreMock.send).toHaveBeenCalledWith(
        DOCUMENT_PATTERNS.UPLOAD_BATCH_TXT,
        expect.objectContaining({
          data: { txtContent: 'test txt' },
        })
      );
    });
  });

  describe('create', () => {
    it('debe enviar DTO de creacion', async () => {
      const dto = { documentType: '01' } as any;
      msCoreMock.send.mockReturnValue(of({ id: '1' }));

      await controller.create(dto, mockUser);

      expect(msCoreMock.send).toHaveBeenCalledWith(
        DOCUMENT_PATTERNS.CREATE,
        expect.objectContaining({ data: dto })
      );
    });
  });

  describe('findAll', () => {
    it('debe enviar paginacion', async () => {
      msCoreMock.send.mockReturnValue(of({ items: [] }));
      
      await controller.findAll(mockUser, 1, 10);
      
      expect(msCoreMock.send).toHaveBeenCalledWith(
        DOCUMENT_PATTERNS.FIND_ALL,
        expect.objectContaining({ data: { page: 1, limit: 10 } })
      );
    });
  });

  describe('export', () => {
    it('debe enviar peticion de exportacion y devolver excel', async () => {
      // Mock rows
      msCoreMock.send.mockReturnValue(of([
        { documentType: '01', subtotal: 10, total: 11 }
      ]));

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
        write: jest.fn(),
      } as unknown as Response;

      await controller.export(mockUser, mockRes, '2023-01-01');

      expect(msCoreMock.send).toHaveBeenCalledWith(
        DOCUMENT_PATTERNS.EXPORT,
        expect.objectContaining({ data: { desde: '2023-01-01' } })
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="comprobantes.xlsx"');
      expect(mockRes.end).toHaveBeenCalled();
    });
  });

  describe('actions (validatePending, retryImports, consolidate, revalidate)', () => {
    it('deben enviar el pattern correspondiente', async () => {
      msCoreMock.send.mockReturnValue(of({}));
      
      await controller.validatePending(mockUser);
      expect(msCoreMock.send).toHaveBeenCalledWith(DOCUMENT_PATTERNS.VALIDATE_PENDING, expect.any(Object));

      await controller.retryImports(mockUser);
      expect(msCoreMock.send).toHaveBeenCalledWith(DOCUMENT_PATTERNS.RETRY_IMPORTS, expect.any(Object));

      await controller.consolidate('123', mockUser);
      expect(msCoreMock.send).toHaveBeenCalledWith(DOCUMENT_PATTERNS.SET_STATUS, expect.objectContaining({ data: { id: '123', action: 'consolidate' }}));
    });
  });
});
