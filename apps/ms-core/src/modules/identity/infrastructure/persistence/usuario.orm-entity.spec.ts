import { UsuarioOrmEntity } from './usuario.orm-entity';

describe('UsuarioOrmEntity', () => {
  it('should be defined', () => {
    const user = new UsuarioOrmEntity();
    user.id = 'uuid-1';
    user.username = 'test';
    user.keycloakId = 'kc-1';
    user.estado = true;
    user.idPersona = 'uuid-persona';
    user.idRol = 'uuid-rol';

    expect(user).toBeDefined();
    expect(user.id).toBe('uuid-1');
    expect(user.username).toBe('test');
  });
});
