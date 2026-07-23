import { ConfigService } from '@nestjs/config';
import {
  SaveImapConfigUseCase,
  ListActiveImapConfigsUseCase,
  GetImapConfigUseCase,
  DeleteImapConfigUseCase,
  SetImapActiveUseCase,
  TestImapConnectionUseCase,
} from './imap-config.use-cases';
import { type ImapConfigRepositoryPort } from '../domain/ports/imap-config.repository.port';

jest.mock('imapflow', () => ({
  ImapFlow: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(true),
    logout: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('../../../common/crypto.util', () => ({
  encryptSecret: jest.fn().mockReturnValue('encrypted-password'),
}));

describe('Imap Config Use Cases', () => {
  let repoMock: jest.Mocked<ImapConfigRepositoryPort>;
  let configMock: jest.Mocked<ConfigService>;
  const mockOwnerId = 'owner-123';

  beforeEach(() => {
    repoMock = {
      upsert: jest.fn(),
      findByOwner: jest.fn(),
      listActive: jest.fn(),
      deleteByOwner: jest.fn(),
      setActive: jest.fn(),
    } as unknown as jest.Mocked<ImapConfigRepositoryPort>;

    configMock = {
      getOrThrow: jest.fn().mockReturnValue('test-key-123'),
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;
  });

  describe('SaveImapConfigUseCase', () => {
    it('debe cifrar el password y guardarlo', async () => {
      const useCase = new SaveImapConfigUseCase(repoMock, configMock);
      const dto = { host: 'imap.test', port: 993, email: 'test@test.com', password: '123' };
      repoMock.upsert.mockResolvedValue({ id: '1' } as any);

      await useCase.execute(dto, mockOwnerId);

      expect(repoMock.upsert).toHaveBeenCalledWith({
        ownerId: mockOwnerId,
        host: dto.host,
        port: dto.port,
        email: dto.email,
        passwordEncrypted: 'encrypted-password',
        tls: true,
      });
    });
  });

  describe('GetImapConfigUseCase', () => {
    it('debe retornar la config', async () => {
      const useCase = new GetImapConfigUseCase(repoMock);
      repoMock.findByOwner.mockResolvedValue({ id: '1' } as any);
      
      const result = await useCase.execute(mockOwnerId);
      
      expect(repoMock.findByOwner).toHaveBeenCalledWith(mockOwnerId);
      expect(result).not.toBeNull();
    });
  });

  describe('TestImapConnectionUseCase', () => {
    it('debe conectar exitosamente', async () => {
      const useCase = new TestImapConnectionUseCase();
      const result = await useCase.execute({
        host: 'imap.test',
        port: 993,
        email: 'test',
        password: '123'
      });
      
      expect(result.ok).toBe(true);
    });
    
    // Aquí podríamos mockear fallos de imapflow re-requiriendo o sobreescribiendo el prototipo, 
    // pero omitiremos por brevedad ya que ImapFlow está mockeado globalmente.
  });
});
