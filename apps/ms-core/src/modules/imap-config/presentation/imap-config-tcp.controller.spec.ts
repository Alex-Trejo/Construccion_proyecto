import { Test, type TestingModule } from '@nestjs/testing';
import { ImapConfigTcpController } from './imap-config-tcp.controller';
import {
  SaveImapConfigUseCase,
  ListActiveImapConfigsUseCase,
  GetImapConfigUseCase,
  DeleteImapConfigUseCase,
  SetImapActiveUseCase,
  TestImapConnectionUseCase,
} from '../application/imap-config.use-cases';

describe('ImapConfigTcpController', () => {
  let controller: ImapConfigTcpController;

  const mockPayload = (data: any = {}) => ({
    data,
    metadata: { userId: 'user-id', role: 'admin' },
  });

  const mockUseCases = {
    saveConfig: { execute: jest.fn() },
    listActive: { execute: jest.fn() },
    getConfig: { execute: jest.fn() },
    deleteConfig: { execute: jest.fn() },
    setActive: { execute: jest.fn() },
    testConnection: { execute: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImapConfigTcpController],
      providers: [
        { provide: SaveImapConfigUseCase, useValue: mockUseCases.saveConfig },
        { provide: ListActiveImapConfigsUseCase, useValue: mockUseCases.listActive },
        { provide: GetImapConfigUseCase, useValue: mockUseCases.getConfig },
        { provide: DeleteImapConfigUseCase, useValue: mockUseCases.deleteConfig },
        { provide: SetImapActiveUseCase, useValue: mockUseCases.setActive },
        { provide: TestImapConnectionUseCase, useValue: mockUseCases.testConnection },
      ],
    }).compile();

    controller = module.get<ImapConfigTcpController>(ImapConfigTcpController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('save', () => {
    it('should call saveConfig', async () => {
      mockUseCases.saveConfig.execute.mockResolvedValue({ id: 'config1' });
      const result = await controller.save(mockPayload({ host: 'imap.test.com' }));
      expect(result).toEqual({ id: 'config1' });
      expect(mockUseCases.saveConfig.execute).toHaveBeenCalledWith({ host: 'imap.test.com' }, 'user-id');
    });
  });

  describe('list', () => {
    it('should call listActive', async () => {
      mockUseCases.listActive.execute.mockResolvedValue([{ id: 'config1' }]);
      const result = await controller.list();
      expect(result).toEqual([{ id: 'config1' }]);
      expect(mockUseCases.listActive.execute).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should call getConfig', async () => {
      mockUseCases.getConfig.execute.mockResolvedValue({ id: 'config1' });
      const result = await controller.get(mockPayload({}));
      expect(result).toEqual({ id: 'config1' });
      expect(mockUseCases.getConfig.execute).toHaveBeenCalledWith('user-id');
    });
  });

  describe('remove', () => {
    it('should call deleteConfig', async () => {
      mockUseCases.deleteConfig.execute.mockResolvedValue(true);
      const result = await controller.remove(mockPayload({}));
      expect(result).toEqual({ deleted: true });
      expect(mockUseCases.deleteConfig.execute).toHaveBeenCalledWith('user-id');
    });
  });

  describe('active', () => {
    it('should call setActive', async () => {
      mockUseCases.setActive.execute.mockResolvedValue({ id: 'config1', isActive: true });
      const result = await controller.active(mockPayload({ isActive: true }));
      expect(result).toEqual({ id: 'config1', isActive: true });
      expect(mockUseCases.setActive.execute).toHaveBeenCalledWith('user-id', true);
    });
  });

  describe('test', () => {
    it('should call testConnection', async () => {
      mockUseCases.testConnection.execute.mockResolvedValue({ success: true, message: 'OK' });
      const result = await controller.test(mockPayload({ host: 'imap.test.com' }));
      expect(result).toEqual({ success: true, message: 'OK' });
      expect(mockUseCases.testConnection.execute).toHaveBeenCalledWith({ host: 'imap.test.com' });
    });
  });
});
