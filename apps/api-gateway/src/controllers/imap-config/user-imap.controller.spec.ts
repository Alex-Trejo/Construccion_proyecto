import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import { UserImapController } from './user-imap.controller';
import { MICROSERVICE_TOKENS, IMAP_PATTERNS, SYNC_PATTERNS } from '@sgc/shared';
import { of } from 'rxjs';

describe('UserImapController', () => {
  let controller: UserImapController;
  let msCoreMock: jest.Mocked<ClientProxy>;
  let msSyncMock: jest.Mocked<ClientProxy>;

  const mockUser = {
    userId: 'user-123',
    username: 'test',
    email: 'test@test.com',
    roles: [],
  } as any;

  beforeEach(async () => {
    msCoreMock = {
      send: jest.fn(),
    } as unknown as jest.Mocked<ClientProxy>;

    msSyncMock = {
      send: jest.fn(),
    } as unknown as jest.Mocked<ClientProxy>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserImapController],
      providers: [
        {
          provide: MICROSERVICE_TOKENS.MS_CORE_CLIENT,
          useValue: msCoreMock,
        },
        {
          provide: MICROSERVICE_TOKENS.MS_SYNC_CLIENT,
          useValue: msSyncMock,
        },
      ],
    }).compile();

    controller = module.get<UserImapController>(UserImapController);
  });

  describe('getImapConfig', () => {
    it('debe enviar peticion al ms-core', async () => {
      msCoreMock.send.mockReturnValue(of({ id: '1' }));
      const result = await controller.getImapConfig(mockUser);
      expect(msCoreMock.send).toHaveBeenCalledWith(IMAP_PATTERNS.GET_CONFIG, expect.any(Object));
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('saveImapConfig', () => {
    it('debe enviar el config a ms-core', async () => {
      const dto = { host: 'test', port: 993, email: 'e', password: 'p' };
      msCoreMock.send.mockReturnValue(of(dto));
      const result = await controller.saveImapConfig(dto, mockUser);
      expect(msCoreMock.send).toHaveBeenCalledWith(IMAP_PATTERNS.SAVE_CONFIG, expect.objectContaining({ data: dto }));
      expect(result).toEqual(dto);
    });
  });

  describe('deleteImapConfig', () => {
    it('debe enviar peticion de borrado a ms-core', async () => {
      msCoreMock.send.mockReturnValue(of({ deleted: true }));
      await controller.deleteImapConfig(mockUser);
      expect(msCoreMock.send).toHaveBeenCalledWith(IMAP_PATTERNS.DELETE_CONFIG, expect.any(Object));
    });
  });

  describe('setActive', () => {
    it('debe enviar peticion set-active a ms-core', async () => {
      msCoreMock.send.mockReturnValue(of({}));
      await controller.setActive({ isActive: true }, mockUser);
      expect(msCoreMock.send).toHaveBeenCalledWith(IMAP_PATTERNS.SET_ACTIVE, expect.objectContaining({ data: { isActive: true } }));
    });
  });

  describe('testConnection', () => {
    it('debe enviar la peticion de test', async () => {
      msCoreMock.send.mockReturnValue(of({ ok: true }));
      await controller.testConnection({} as any, mockUser);
      expect(msCoreMock.send).toHaveBeenCalledWith(IMAP_PATTERNS.TEST_CONNECTION, expect.any(Object));
    });
  });

  describe('triggerSync', () => {
    it('debe enviar el trigger a ms-sync', async () => {
      msSyncMock.send.mockReturnValue(of({ processed: 1 }));
      await controller.triggerSync(mockUser);
      expect(msSyncMock.send).toHaveBeenCalledWith(SYNC_PATTERNS.TRIGGER_SYNC, expect.any(Object));
    });
  });
});
