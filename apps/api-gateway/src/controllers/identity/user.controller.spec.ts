import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import { UserController } from './user.controller';
import { KeycloakAdminService } from '../../keycloak/keycloak-admin.service';
import { MICROSERVICE_TOKENS, IDENTITY_PATTERNS } from '@sgc/shared';
import { of } from 'rxjs';

describe('UserController', () => {
  let controller: UserController;
  let kcAdminMock: jest.Mocked<KeycloakAdminService>;
  let msCoreMock: jest.Mocked<ClientProxy>;

  beforeEach(async () => {
    kcAdminMock = {
      listUsers: jest.fn(),
      createUser: jest.fn(),
      setUserRoles: jest.fn(),
    } as unknown as jest.Mocked<KeycloakAdminService>;

    msCoreMock = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<ClientProxy>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
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

    controller = module.get<UserController>(UserController);
  });

  describe('list', () => {
    it('debe listar usuarios de Keycloak', async () => {
      kcAdminMock.listUsers.mockResolvedValue([]);
      await controller.list();
      expect(kcAdminMock.listUsers).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('debe crear el usuario en Keycloak y emitir SYNC_USER', async () => {
      const mockDto = { username: 'test', password: '123', email: 'test@test.com', firstName: 'a', lastName: 'b' };
      const mockCreated = { id: '1', username: 'test', email: 'test@test.com', firstName: 'a', lastName: 'b', roles: [] };
      
      kcAdminMock.createUser.mockResolvedValue(mockCreated);
      msCoreMock.emit.mockReturnValue(of(null));

      const result = await controller.create(mockDto);

      expect(kcAdminMock.createUser).toHaveBeenCalledWith(mockDto);
      expect(msCoreMock.emit).toHaveBeenCalledWith(
        IDENTITY_PATTERNS.SYNC_USER,
        expect.objectContaining({ keycloakId: '1', username: 'test' })
      );
      expect(result).toEqual(mockCreated);
    });
  });

  describe('setRoles', () => {
    it('debe setear roles en Keycloak y emitir SYNC_USER', async () => {
      const mockCreated = { id: '1', username: 'test', email: 'test@test.com', firstName: 'a', lastName: 'b', roles: ['Admin'] };
      
      kcAdminMock.setUserRoles.mockResolvedValue(mockCreated);
      msCoreMock.emit.mockReturnValue(of(null));

      const result = await controller.setRoles('1', { roles: ['Admin'] });

      expect(kcAdminMock.setUserRoles).toHaveBeenCalledWith('1', ['Admin']);
      expect(msCoreMock.emit).toHaveBeenCalledWith(
        IDENTITY_PATTERNS.SYNC_USER,
        expect.objectContaining({ keycloakId: '1', roles: ['Admin'] })
      );
      expect(result).toEqual(mockCreated);
    });
  });
});
