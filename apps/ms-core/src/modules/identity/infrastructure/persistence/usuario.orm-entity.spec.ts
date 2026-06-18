import { UsuarioOrmEntity } from './usuario.orm-entity';

describe('UsuarioOrmEntity', () => {
  it('should be defined', () => {
    const user = new UsuarioOrmEntity();
    user.id = 1;
    user.username = 'test';
    user.keycloakId = 'kc-1';
    user.estado = true;
    user.emailVerificado = false;
    user.personaId = 1;
    user.rolId = 1;

    expect(user).toBeDefined();
    expect(user.id).toBe(1);
    expect(user.username).toBe('test');
  });
});
