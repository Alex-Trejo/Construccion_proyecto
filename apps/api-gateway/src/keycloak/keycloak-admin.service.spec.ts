import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KeycloakAdminService } from './keycloak-admin.service';
import { BadGatewayException } from '@nestjs/common';

describe('KeycloakAdminService', () => {
  let service: KeycloakAdminService;
  let configMock: jest.Mocked<ConfigService>;
  
  const mockFetch = jest.fn();
  global.fetch = mockFetch;

  beforeEach(async () => {
    configMock = {
      getOrThrow: jest.fn((key: string) => {
        const vals: Record<string, string> = {
          KEYCLOAK_ISSUER_URL: 'http://kc:8080/realms/sgc',
          KEYCLOAK_REALM: 'sgc',
          KEYCLOAK_ADMIN_USER: 'admin',
          KEYCLOAK_ADMIN_PASSWORD: 'admin',
        };
        return vals[key];
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeycloakAdminService,
        {
          provide: ConfigService,
          useValue: configMock,
        },
      ],
    }).compile();

    service = module.get<KeycloakAdminService>(KeycloakAdminService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  const mockToken = () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'token' }),
    });
  };

  it('debe listar roles', async () => {
    mockToken();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify([{ id: '1', name: 'Admin', description: 'd' }, { id: '2', name: 'default-roles-sgc' }]),
    });

    const result = await service.listRoles();
    expect(result).toEqual([{ name: 'Admin', description: 'd' }]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('debe lanzar error si auth falla', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    });
    await expect(service.listRoles()).rejects.toThrow(BadGatewayException);
  });

  it('debe lanzar error si api falla', async () => {
    mockToken();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Bad Request',
    });
    await expect(service.listRoles()).rejects.toThrow(BadGatewayException);
  });

  it('debe crear un rol', async () => {
    mockToken();
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });

    const result = await service.createRole({ name: 'Admin', description: 'd' });
    expect(result).toEqual({ name: 'Admin', description: 'd' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/roles'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('debe eliminar un rol', async () => {
    mockToken();
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });

    await service.deleteRole('Admin');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/roles/Admin'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('debe listar usuarios', async () => {
    mockToken(); // for listUsers
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([
        { id: 'u1', username: 'test1', email: 'test@test', firstName: 'f', lastName: 'l', enabled: true }
      ]),
    });
    
    mockToken(); // for getUserRealmRoles
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([{ name: 'Admin' }]),
    });

    const users = await service.listUsers();
    expect(users).toHaveLength(1);
    expect(users[0].username).toBe('test1');
    expect(users[0].roles).toEqual(['Admin']);
  });

  it('debe crear un usuario', async () => {
    mockToken(); // POST users
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });

    mockToken(); // GET users exact
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([{ id: 'u1', username: 'test1', enabled: true }]),
    });

    // Mock para setUserRoles:
    mockToken(); // GET roles
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([{ id: 'r1', name: 'Admin' }]),
    });
    mockToken(); // GET role mappings
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([]),
    });
    mockToken(); // POST role mappings
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });
    mockToken(); // GET user (refetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ id: 'u1', username: 'test1', enabled: true }),
    });
    mockToken(); // GET roles (final)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([{ name: 'Admin' }]),
    });
    
    // MISSING call from createUser -> getUserRealmRoles
    mockToken(); // GET roles (createUser final)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([{ name: 'Admin' }]),
    });

    const user = await service.createUser({
      username: 'test1',
      password: 'pwd',
      email: 'a@a',
      firstName: 'f',
      lastName: 'l',
      role: 'Admin',
    });

    expect(user.username).toBe('test1');
    expect(user.roles).toEqual(['Admin']);
  });

  it('debe lanzar error si createUser falla al buscar el usuario creado', async () => {
    mockToken(); // POST
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });

    mockToken(); // GET exact -> vacio
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([]),
    });

    await expect(service.createUser({ username: 'test', password: 'pwd', email: 'e', firstName: 'f', lastName: 'l', role: 'role' }))
      .rejects.toThrow('Usuario creado en Keycloak pero no recuperable.');
  });

  it('debe actualizar roles de usuario agregando y quitando', async () => {
    // setUserRoles
    mockToken(); // GET roles
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([{ id: 'r1', name: 'Role1' }, { id: 'r2', name: 'Role2' }]),
    });
    mockToken(); // GET mappings (current: Role1)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([{ id: 'r1', name: 'Role1' }]),
    });
    
    // Target is 'Role2' -> should remove Role1 and add Role2
    mockToken(); // POST mapping to add Role2
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });

    mockToken(); // DELETE mapping to remove Role1
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });

    mockToken(); // GET user
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ id: 'u1', username: 'test1', enabled: true }),
    });

    mockToken(); // GET mappings final
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([{ id: 'r2', name: 'Role2' }]),
    });

    const user = await service.setUserRoles('u1', ['Role2']);
    expect(user.roles).toEqual(['Role2']);
  });
});
