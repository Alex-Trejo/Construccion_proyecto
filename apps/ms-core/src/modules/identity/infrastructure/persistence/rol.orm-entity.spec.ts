import { RolOrmEntity } from './rol.orm-entity';

describe('RolOrmEntity', () => {
  it('should be defined', () => {
    const rol = new RolOrmEntity();
    rol.id = 'uuid-1';
    rol.nombreRol = 'Admin';
    rol.descripcion = 'Administrator';
    rol.isActive = true;

    expect(rol).toBeDefined();
    expect(rol.id).toBe('uuid-1');
    expect(rol.nombreRol).toBe('Admin');
  });
});
