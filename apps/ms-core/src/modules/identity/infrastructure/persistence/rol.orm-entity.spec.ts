import { RolOrmEntity } from './rol.orm-entity';

describe('RolOrmEntity', () => {
  it('should be defined', () => {
    const rol = new RolOrmEntity();
    rol.id = 1;
    rol.nombre = 'Admin';
    rol.descripcion = 'Administrator';
    rol.estado = true;

    expect(rol).toBeDefined();
    expect(rol.id).toBe(1);
    expect(rol.nombre).toBe('Admin');
  });
});
