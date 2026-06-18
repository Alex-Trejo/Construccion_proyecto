import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import { IdentitySyncHandler } from './identity-sync.handler';
import { PersonaOrmEntity } from '../../infrastructure/persistence/persona.orm-entity';
import { UsuarioOrmEntity } from '../../infrastructure/persistence/usuario.orm-entity';
import { RolOrmEntity } from '../../infrastructure/persistence/rol.orm-entity';

describe('IdentitySyncHandler', () => {
  let handler: IdentitySyncHandler;
  let personaRepoMock: any;
  let usuarioRepoMock: any;
  let rolRepoMock: any;

  beforeEach(async () => {
    personaRepoMock = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    usuarioRepoMock = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    rolRepoMock = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdentitySyncHandler],
      providers: [
        {
          provide: getRepositoryToken(PersonaOrmEntity),
          useValue: personaRepoMock,
        },
        {
          provide: getRepositoryToken(UsuarioOrmEntity),
          useValue: usuarioRepoMock,
        },
        {
          provide: getRepositoryToken(RolOrmEntity),
          useValue: rolRepoMock,
        },
      ],
    }).compile();

    handler = module.get<IdentitySyncHandler>(IdentitySyncHandler);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => { });
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const basePayload = {
    keycloakId: '123',
    username: 'testuser',
    email: 'test@test.com',
    firstName: 'Test',
    lastName: 'User',
    roles: ['Administrador'],
  };

  it('should sync a new user and persona successfully', async () => {
    personaRepoMock.findOne.mockResolvedValue(null);
    personaRepoMock.create.mockReturnValue({ id: 'uuid-1', ...basePayload });
    personaRepoMock.save.mockResolvedValue({ id: 'uuid-1', ...basePayload });

    rolRepoMock.findOne.mockResolvedValue({ id: 'uuid-10', nombreRol: 'Administrador' });

    usuarioRepoMock.findOne.mockResolvedValue(null);
    usuarioRepoMock.create.mockReturnValue({ id: 'uuid-100' });
    usuarioRepoMock.save.mockResolvedValue({ id: 'uuid-100' });

    const result = await handler.syncUser(basePayload);

    expect(result).toEqual({ synced: true });
    expect(personaRepoMock.create).toHaveBeenCalled();
    expect(usuarioRepoMock.create).toHaveBeenCalled();
  });

  it('should update existing persona and user', async () => {
    const existingPersona = { id: 'uuid-1', nombres: 'Old', apellidos: 'Old' };
    const existingUser = { id: 'uuid-100', ultimoAcceso: new Date('2020-01-01') };

    personaRepoMock.findOne.mockResolvedValue(existingPersona);
    personaRepoMock.save.mockResolvedValue(existingPersona);

    rolRepoMock.findOne.mockResolvedValue({ id: 'uuid-10', nombreRol: 'Administrador' });

    usuarioRepoMock.findOne.mockResolvedValue(existingUser);
    usuarioRepoMock.save.mockResolvedValue(existingUser);

    const result = await handler.syncUser(basePayload);

    expect(result).toEqual({ synced: true });
    expect(personaRepoMock.create).not.toHaveBeenCalled();
    expect(usuarioRepoMock.create).not.toHaveBeenCalled();
    expect(personaRepoMock.save).toHaveBeenCalled();
    expect(usuarioRepoMock.save).toHaveBeenCalled();
  });

  it('should fail if role is not found', async () => {
    personaRepoMock.findOne.mockResolvedValue({ id: 'uuid-1' });
    personaRepoMock.save.mockResolvedValue({ id: 'uuid-1' });

    rolRepoMock.findOne.mockResolvedValue(null);

    const result = await handler.syncUser(basePayload);

    expect(result).toEqual({ synced: false });
    expect(usuarioRepoMock.findOne).not.toHaveBeenCalled();
  });

  it('should catch errors and return synced false', async () => {
    personaRepoMock.findOne.mockRejectedValue(new Error('DB Error'));

    const result = await handler.syncUser(basePayload);

    expect(result).toEqual({ synced: false });
  });

  it('should handle persona duplicate key violation and recover', async () => {
    personaRepoMock.findOne.mockResolvedValueOnce(null);
    personaRepoMock.create.mockReturnValue({ id: 'uuid-1', ...basePayload });

    // Simular error 23505 en save
    personaRepoMock.save.mockRejectedValueOnce({ code: '23505' });

    // Mock findOneOrFail para recuperar
    personaRepoMock.findOneOrFail = jest.fn().mockResolvedValue({ id: 'uuid-1', email: basePayload.email });

    rolRepoMock.findOne.mockResolvedValue({ id: 'uuid-10', nombreRol: 'Administrador' });
    usuarioRepoMock.findOne.mockResolvedValue({ id: 'uuid-100', ultimoAcceso: new Date() });
    usuarioRepoMock.save.mockResolvedValue({});

    const result = await handler.syncUser(basePayload);

    expect(result).toEqual({ synced: true });
    expect(personaRepoMock.findOneOrFail).toHaveBeenCalledWith({ where: { email: basePayload.email } });
  });

  it('should rethrow persona save error if not 23505', async () => {
    personaRepoMock.findOne.mockResolvedValueOnce(null);
    personaRepoMock.create.mockReturnValue({ id: 'uuid-1', ...basePayload });
    personaRepoMock.save.mockRejectedValueOnce({ code: '50000', message: 'Other Error' });

    const result = await handler.syncUser(basePayload);

    expect(result).toEqual({ synced: false });
  });

  it('should handle usuario duplicate key violation and recover', async () => {
    const existingPersona = { id: 'uuid-1', nombres: 'Test', apellidos: 'User' };
    personaRepoMock.findOne.mockResolvedValue(existingPersona);
    personaRepoMock.save.mockResolvedValue(existingPersona);

    rolRepoMock.findOne.mockResolvedValue({ id: 'uuid-10', nombreRol: 'Administrador' });

    usuarioRepoMock.findOne.mockResolvedValueOnce(null);
    usuarioRepoMock.create.mockReturnValue({ id: 'uuid-100' });

    // Simular error 23505 en save de usuario
    usuarioRepoMock.save.mockRejectedValueOnce({ code: '23505' });

    // Mock findOneOrFail para recuperar
    usuarioRepoMock.findOneOrFail = jest.fn().mockResolvedValue({ id: 'uuid-100', keycloakId: basePayload.keycloakId });
    // Save exitoso en el catch
    usuarioRepoMock.save.mockResolvedValueOnce({});

    const result = await handler.syncUser(basePayload);

    expect(result).toEqual({ synced: true });
    expect(usuarioRepoMock.findOneOrFail).toHaveBeenCalledWith({ where: { keycloakId: basePayload.keycloakId } });
    expect(usuarioRepoMock.save).toHaveBeenCalledTimes(2); // 1 error, 1 recovery
  });

  it('should rethrow usuario save error if not 23505', async () => {
    const existingPersona = { id: 'uuid-1' };
    personaRepoMock.findOne.mockResolvedValue(existingPersona);
    personaRepoMock.save.mockResolvedValue(existingPersona);

    rolRepoMock.findOne.mockResolvedValue({ id: 'uuid-10', nombreRol: 'Administrador' });

    usuarioRepoMock.findOne.mockResolvedValueOnce(null);
    usuarioRepoMock.create.mockReturnValue({ id: 'uuid-100' });
    usuarioRepoMock.save.mockRejectedValueOnce({ code: '50000', message: 'Other Error' });

    const result = await handler.syncUser(basePayload);

    expect(result).toEqual({ synced: false });
  });

  it('should fallback to Asistente if roles array is empty', async () => {
    personaRepoMock.findOne.mockResolvedValue({ id: 'uuid-1' });
    personaRepoMock.save.mockResolvedValue({ id: 'uuid-1' });
    usuarioRepoMock.findOne.mockResolvedValue({ id: 'uuid-100' });
    usuarioRepoMock.save.mockResolvedValue({});

    rolRepoMock.findOne.mockResolvedValue({ id: 'uuid-10', nombreRol: 'Asistente' });

    const payloadWithoutRoles = { ...basePayload, roles: [] };
    await handler.syncUser(payloadWithoutRoles);

    expect(rolRepoMock.findOne).toHaveBeenCalledWith({ where: { nombreRol: 'Asistente' } });
  });

  it('should fallback to Asistente if role is not recognized', async () => {
    personaRepoMock.findOne.mockResolvedValue({ id: 'uuid-1' });
    personaRepoMock.save.mockResolvedValue({ id: 'uuid-1' });
    usuarioRepoMock.findOne.mockResolvedValue({ id: 'uuid-100' });
    usuarioRepoMock.save.mockResolvedValue({});

    rolRepoMock.findOne.mockResolvedValue({ id: 'uuid-10', nombreRol: 'Asistente' });

    const payloadWithUnknownRole = { ...basePayload, roles: ['UnknownRole'] };
    await handler.syncUser(payloadWithUnknownRole);

    expect(rolRepoMock.findOne).toHaveBeenCalledWith({ where: { nombreRol: 'Asistente' } });
  });

  it('should use username if firstName is missing for Persona creation', async () => {
    personaRepoMock.findOne.mockResolvedValue(null);
    personaRepoMock.create.mockReturnValue({ id: 'uuid-1' });
    personaRepoMock.save.mockResolvedValue({ id: 'uuid-1' });
    rolRepoMock.findOne.mockResolvedValue({ id: 'uuid-10', nombreRol: 'Asistente' });
    usuarioRepoMock.findOne.mockResolvedValue({ id: 'uuid-100' });
    usuarioRepoMock.save.mockResolvedValue({});

    const payloadNoFirstName = { ...basePayload, firstName: '' };
    await handler.syncUser(payloadNoFirstName);

    expect(personaRepoMock.create).toHaveBeenCalledWith(expect.objectContaining({
      nombres: 'testuser',
      apellidos: 'User'
    }));
  });

  it('should keep existing nombres if payload firstName is missing on update', async () => {
    const existingPersona = { id: 'uuid-1', nombres: 'OldName', apellidos: 'OldLastName' };
    personaRepoMock.findOne.mockResolvedValue(existingPersona);
    personaRepoMock.save.mockResolvedValue(existingPersona);
    rolRepoMock.findOne.mockResolvedValue({ id: 'uuid-10', nombreRol: 'Asistente' });
    usuarioRepoMock.findOne.mockResolvedValue({ id: 'uuid-100' });
    usuarioRepoMock.save.mockResolvedValue({});

    const payloadNoFirstName = { ...basePayload, firstName: '', lastName: '' };
    await handler.syncUser(payloadNoFirstName);

    expect(existingPersona.nombres).toBe('OldName');
    expect(existingPersona.apellidos).toBe('OldLastName');
  });

});