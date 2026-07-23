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
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  it('debe listar roles', async () => {
    // Mock getAdminToken
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'token' }),
    });

    // Mock get roles
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify([{ id: '1', name: 'Admin', description: 'd' }]),
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

  it('debe crear un rol', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'token' }) });
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });

    const result = await service.createRole({ name: 'Admin', description: 'd' });
    expect(result).toEqual({ name: 'Admin', description: 'd' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/roles'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});
