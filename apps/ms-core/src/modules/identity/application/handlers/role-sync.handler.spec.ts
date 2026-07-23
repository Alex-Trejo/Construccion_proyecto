import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RoleSyncHandler } from './role-sync.handler';
import { RolOrmEntity } from '../../infrastructure/persistence/rol.orm-entity';

describe('RoleSyncHandler', () => {
  let handler: RoleSyncHandler;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleSyncHandler],
      providers: [
        {
          provide: getRepositoryToken(RolOrmEntity),
          useValue: mockRepo,
        },
      ],
    }).compile();

    handler = module.get<RoleSyncHandler>(RoleSyncHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('upsert', () => {
    it('should create a new role if it does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue({ nombreRol: 'Admin', isActive: true });

      await handler.upsert({ nombreRol: 'Admin', descripcion: 'Admin role' });

      expect(mockRepo.create).toHaveBeenCalledWith({
        nombreRol: 'Admin',
        descripcion: 'Admin role',
        isActive: true,
      });
      expect(mockRepo.save).toHaveBeenCalledWith({ nombreRol: 'Admin', isActive: true });
    });

    it('should update existing role if it exists', async () => {
      const existing = { nombreRol: 'Admin', descripcion: 'Old', isActive: false };
      mockRepo.findOne.mockResolvedValue(existing);

      await handler.upsert({ nombreRol: 'Admin', descripcion: 'New' });

      expect(existing.descripcion).toBe('New');
      expect(existing.isActive).toBe(true);
      expect(mockRepo.save).toHaveBeenCalledWith(existing);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('should catch errors and log them', async () => {
      mockRepo.findOne.mockRejectedValue(new Error('DB Error'));
      const loggerErrorSpy = jest.spyOn((handler as any).logger, 'error');

      await handler.upsert({ nombreRol: 'Admin' });

      expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('DB Error'));
    });
  });

  describe('remove', () => {
    it('should set isActive to false', async () => {
      mockRepo.update.mockResolvedValue({ affected: 1 });

      await handler.remove({ nombreRol: 'Admin' });

      expect(mockRepo.update).toHaveBeenCalledWith(
        { nombreRol: 'Admin' },
        { isActive: false }
      );
    });

    it('should catch errors and log them', async () => {
      mockRepo.update.mockRejectedValue(new Error('DB Error'));
      const loggerErrorSpy = jest.spyOn((handler as any).logger, 'error');

      await handler.remove({ nombreRol: 'Admin' });

      expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('DB Error'));
    });
  });
});
