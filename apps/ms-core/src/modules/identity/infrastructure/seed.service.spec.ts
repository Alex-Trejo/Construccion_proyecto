import { Repository } from 'typeorm';
import { SeedService } from './seed.service';
import { RolOrmEntity } from './persistence/rol.orm-entity';
import { TipoComprobanteOrmEntity } from '../../document/infrastructure/persistence/tipo-comprobante.orm-entity';

describe('SeedService', () => {
  let seedService: SeedService;
  let rolRepoMock: jest.Mocked<Repository<RolOrmEntity>>;
  let tipoRepoMock: jest.Mocked<Repository<TipoComprobanteOrmEntity>>;

  beforeEach(() => {
    rolRepoMock = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<RolOrmEntity>>;

    tipoRepoMock = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<TipoComprobanteOrmEntity>>;

    seedService = new SeedService(rolRepoMock, tipoRepoMock);
  });

  it('debe insertar roles y comprobantes si no existen', async () => {
    rolRepoMock.findOne.mockResolvedValue(null);
    rolRepoMock.create.mockImplementation((dto) => dto as any);

    tipoRepoMock.findOne.mockResolvedValue(null);
    tipoRepoMock.create.mockImplementation((dto) => dto as any);

    await seedService.onModuleInit();

    // Roles (Admin, Contador, Asistente)
    expect(rolRepoMock.findOne).toHaveBeenCalledTimes(3);
    expect(rolRepoMock.save).toHaveBeenCalledTimes(3);

    // Comprobantes (01, 04, 05, 06, 07)
    expect(tipoRepoMock.findOne).toHaveBeenCalledTimes(5);
    expect(tipoRepoMock.save).toHaveBeenCalledTimes(5);
  });

  it('no debe insertar si ya existen', async () => {
    rolRepoMock.findOne.mockResolvedValue({ id: 'role-1' } as any);
    tipoRepoMock.findOne.mockResolvedValue({ id: 'tipo-1' } as any);

    await seedService.onModuleInit();

    expect(rolRepoMock.findOne).toHaveBeenCalledTimes(3);
    expect(rolRepoMock.save).not.toHaveBeenCalled();

    expect(tipoRepoMock.findOne).toHaveBeenCalledTimes(5);
    expect(tipoRepoMock.save).not.toHaveBeenCalled();
  });
});
