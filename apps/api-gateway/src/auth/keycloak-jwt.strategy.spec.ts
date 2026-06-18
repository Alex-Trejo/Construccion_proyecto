/**
 * @fileoverview Tests unitarios — KeycloakJwtStrategy.validate().
 *
 * Verifica que el método validate() transforma correctamente
 * el payload JWT de Keycloak en un AuthenticatedUser.
 * No se prueba la validación criptográfica (eso es responsabilidad
 * de passport-jwt + jwks-rsa), solo la extracción de claims.
 */

import { KeycloakJwtStrategy } from './keycloak-jwt.strategy';
import type { AuthenticatedUser } from './keycloak-jwt.strategy';

// Mock del ConfigService para evitar dependencia real
const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('http://localhost:8080/realms/test'),
};

describe('KeycloakJwtStrategy', () => {
  let strategy: KeycloakJwtStrategy;

  beforeEach(() => {
    strategy = new KeycloakJwtStrategy(mockConfigService as any);
  });

  describe('validate()', () => {
    it('debe extraer todos los campos del JWT payload', () => {
      const payload = {
        sub: 'user-uuid-123',
        preferred_username: 'jperez',
        email: 'jperez@test.com',
        given_name: 'Juan',
        family_name: 'Pérez',
        realm_access: { roles: ['admin', 'user'] },
      };

      const result: AuthenticatedUser = strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-uuid-123',
        username: 'jperez',
        email: 'jperez@test.com',
        firstName: 'Juan',
        lastName: 'Pérez',
        roles: ['admin', 'user'],
      });
    });

    it('debe usar valores por defecto cuando faltan claims opcionales', () => {
      const payload = {
        sub: 'user-uuid-456',
        // Sin preferred_username, email, given_name, family_name, realm_access
      };

      const result: AuthenticatedUser = strategy.validate(payload);

      expect(result.userId).toBe('user-uuid-456');
      expect(result.username).toBe('');
      expect(result.email).toBe('');
      expect(result.firstName).toBe('');
      expect(result.lastName).toBe('');
      expect(result.roles).toEqual([]);
    });

    it('debe retornar roles vacíos si realm_access existe pero sin roles', () => {
      const payload = {
        sub: 'user-uuid-789',
        realm_access: {},
      };

      const result: AuthenticatedUser = strategy.validate(payload);
      expect(result.roles).toEqual([]);
    });
  });
});
