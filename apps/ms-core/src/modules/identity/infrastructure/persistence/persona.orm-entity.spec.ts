import { PersonaOrmEntity } from './persona.orm-entity';

describe('PersonaOrmEntity', () => {
  it('should be defined', () => {
    const persona = new PersonaOrmEntity();
    persona.id = 1;
    persona.cedula = '1234567890';
    persona.nombres = 'Juan';
    persona.apellidos = 'Perez';
    persona.email = 'juan@test.com';

    expect(persona).toBeDefined();
    expect(persona.id).toBe(1);
    expect(persona.nombres).toBe('Juan');
  });
});
