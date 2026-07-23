import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import { RoleController } from './role.controller';
import { KeycloakAdminService } from '../../keycloak/keycloak-admin.service';
import { MICROSERVICE_TOKENS, IDENTITY_PATTERNS } from '@sgc/shared';
import { of } from 'rxjs';

describe('RoleController', () => {
  let controller: RoleController;
  let kcAdminMock: jest.Mocked<KeycloakAdminService>;
  let msCoreMock: jest.Mocked<ClientProxy>;

  beforeEach(async () => {
    kcAdminMock = {
      listRoles: jest.fn(),
      createRole: jest.fn(),
      deleteRole: jest.fn(),
    } as unknown as jest.Mocked<KeycloakAdminService>;

    msCoreMock = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<ClientProxy>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [
        {
          provide: KeycloakAdminService,
          useValue: kcAdminMock,
        },
        {
          provide: MICROSERVICE_TOKENS.MS_CORE_CLIENT,
          useValue: msCoreMock,
        },
      ],
    }).compile();

    controller = module.get<RoleController>(RoleController);
  });

  describe('list', () => {
    it('debe devolver roles desde keycloak', async () => {
      const mockRoles = [{ id: '1', name: 'Admin', description: 'desc' }];
      kcAdminMock.listRoles.mockResolvedValue(mockRoles);

      const result = await controller.list();

      expect(kcAdminMock.listRoles).toHaveBeenCalled();
      expect(result).toEqual(mockRoles);
    });
  });

  describe('create', () => {
    it('debe crear rol en KC y emitir a ms-core', async () => {
      const dto = { name: 'Admin', description: 'desc' };
      kcAdminMock.createRole.mockResolvedValue({ id: '1', name: 'Admin', description: 'desc' });
      msCoreMock.emit.mockReturnValue(of(null));

      const result = await controller.create(dto);

      expect(kcAdminMock.createRole).toHaveBeenCalledWith(dto);
      expect(msCoreMock.emit).toHaveBeenCalledWith(
        IDENTITY_PATTERNS.UPSERT_ROLE,
        { nombreRol: 'Admin', descripcion: 'desc' }
      );
      expect(result).toHaveProperty('name', 'Admin');
    });
  });

  describe('remove', () => {
    it('debe borrar rol de KC y emitir a ms-core', async () => {
      msCoreMock.emit.mockReturnValue(of(null));

      const result = await controller.remove('Admin');

      expect(kcAdminMock.deleteRole).toHaveBeenCalledWith('Admin');
      expect(msCoreMock.emit).toHaveBeenCalledWith(
        IDENTITY_PATTERNS.DELETE_ROLE,
        { nombreRol: 'Admin' }
      );
      expect(result).toEqual({ deleted: 'Admin' });
    });
  });
});
