import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  SaveImapConfigUseCase,
  ListActiveImapConfigsUseCase,
  GetImapConfigUseCase,
  DeleteImapConfigUseCase,
  SetImapActiveUseCase,
  TestImapConnectionUseCase,
} from './imap-config.use-cases';
import { IMAP_CONFIG_REPOSITORY_PORT } from '../domain/ports/imap-config.repository.port';
import * as cryptoUtil from '../../../common/crypto.util';
import { ImapFlow } from 'imapflow';

jest.mock('imapflow');
jest.mock('../../../common/crypto.util');

describe('ImapConfigUseCases', () => {
  const mockRepo = {
    upsert: jest.fn(),
    listActive: jest.fn(),
    findByOwner: jest.fn(),
    deleteByOwner: jest.fn(),
    setActive: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue('test-key-32-chars-long-12345678'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SaveImapConfigUseCase', () => {
    let useCase: SaveImapConfigUseCase;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SaveImapConfigUseCase,
          { provide: IMAP_CONFIG_REPOSITORY_PORT, useValue: mockRepo },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      useCase = module.get(SaveImapConfigUseCase);
    });

    it('should encrypt password and upsert config', async () => {
      (cryptoUtil.encryptSecret as jest.Mock).mockReturnValue('encrypted-pass');
      mockRepo.upsert.mockResolvedValue({ id: 'config-1' });

      const result = await useCase.execute(
        { email: 'a@a', password: 'pwd', host: 'host', port: 993 },
        'owner-1'
      );

      expect(result.id).toBe('config-1');
      expect(cryptoUtil.encryptSecret).toHaveBeenCalledWith('pwd', 'test-key-32-chars-long-12345678');
      expect(mockRepo.upsert).toHaveBeenCalledWith({
        ownerId: 'owner-1',
        host: 'host',
        port: 993,
        email: 'a@a',
        passwordEncrypted: 'encrypted-pass',
        tls: true,
      });
    });
  });

  describe('Simple Repository Delegates', () => {
    it('ListActiveImapConfigsUseCase', async () => {
      const module = await Test.createTestingModule({
        providers: [ListActiveImapConfigsUseCase, { provide: IMAP_CONFIG_REPOSITORY_PORT, useValue: mockRepo }]
      }).compile();
      const uc = module.get(ListActiveImapConfigsUseCase);
      mockRepo.listActive.mockResolvedValue([]);
      expect(await uc.execute()).toEqual([]);
    });

    it('GetImapConfigUseCase', async () => {
      const module = await Test.createTestingModule({
        providers: [GetImapConfigUseCase, { provide: IMAP_CONFIG_REPOSITORY_PORT, useValue: mockRepo }]
      }).compile();
      const uc = module.get(GetImapConfigUseCase);
      mockRepo.findByOwner.mockResolvedValue({ id: '1' });
      expect(await uc.execute('owner1')).toEqual({ id: '1' });
    });

    it('DeleteImapConfigUseCase', async () => {
      const module = await Test.createTestingModule({
        providers: [DeleteImapConfigUseCase, { provide: IMAP_CONFIG_REPOSITORY_PORT, useValue: mockRepo }]
      }).compile();
      const uc = module.get(DeleteImapConfigUseCase);
      mockRepo.deleteByOwner.mockResolvedValue(true);
      expect(await uc.execute('owner1')).toBe(true);
    });

    it('SetImapActiveUseCase', async () => {
      const module = await Test.createTestingModule({
        providers: [SetImapActiveUseCase, { provide: IMAP_CONFIG_REPOSITORY_PORT, useValue: mockRepo }]
      }).compile();
      const uc = module.get(SetImapActiveUseCase);
      mockRepo.setActive.mockResolvedValue({ id: '1', isActive: true });
      expect(await uc.execute('owner1', true)).toEqual({ id: '1', isActive: true });
    });
  });

  describe('TestImapConnectionUseCase', () => {
    let useCase: TestImapConnectionUseCase;
    let mockClient: any;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [TestImapConnectionUseCase],
      }).compile();
      useCase = module.get(TestImapConnectionUseCase);

      mockClient = {
        connect: jest.fn(),
        logout: jest.fn(),
      };
      (ImapFlow as jest.Mock).mockImplementation(() => mockClient);
    });

    it('should return ok=true if connection succeeds', async () => {
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.logout.mockResolvedValue(undefined);

      const res = await useCase.execute({ email: 'a@a', password: 'pwd', host: 'host', port: 993 });
      
      expect(res.ok).toBe(true);
      expect(res.message).toContain('Conexión exitosa');
    });

    it('should catch and classify AUTHENTICATIONFAILED', async () => {
      mockClient.connect.mockRejectedValue(new Error('AUTHENTICATIONFAILED'));
      mockClient.logout.mockRejectedValue(new Error('Logout fail')); // should ignore inner error
      
      const res = await useCase.execute({ email: 'a@a', password: 'pwd', host: 'host', port: 993 });
      
      expect(res.ok).toBe(false);
      expect(res.message).toContain('Autenticación rechazada');
    });

    it('should catch and classify ENOTFOUND', async () => {
      mockClient.connect.mockRejectedValue({ code: 'ENOTFOUND' });
      const res = await useCase.execute({ email: 'a@a', password: 'pwd', host: 'host', port: 993 });
      expect(res.message).toContain('No se encontró el servidor');
    });

    it('should catch and classify ECONNREFUSED', async () => {
      mockClient.connect.mockRejectedValue({ code: 'ECONNREFUSED' });
      const res = await useCase.execute({ email: 'a@a', password: 'pwd', host: 'host', port: 993 });
      expect(res.message).toContain('Conexión rechazada');
    });

    it('should catch and classify ETIMEDOUT', async () => {
      mockClient.connect.mockRejectedValue(new Error('Connection timeout'));
      const res = await useCase.execute({ email: 'a@a', password: 'pwd', host: 'host', port: 993 });
      expect(res.message).toContain('Tiempo de espera agotado');
    });

    it('should catch generic errors', async () => {
      mockClient.connect.mockRejectedValue(new Error('Unknown protocol error'));
      const res = await useCase.execute({ email: 'a@a', password: 'pwd', host: 'host', port: 993 });
      expect(res.message).toContain('No se pudo conectar: Unknown protocol error');
    });
  });
});
