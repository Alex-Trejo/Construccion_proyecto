/**
 * @fileoverview Tests unitarios — HealthController del API Gateway.
 *
 * Verifica que el endpoint raíz responde con el estado del servicio.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('root()', () => {
    it('debe retornar status "ok"', () => {
      const result = controller.root();
      expect(result.status).toBe('ok');
    });

    it('debe retornar el nombre del servicio', () => {
      const result = controller.root();
      expect(result.service).toBe('sgc-api-gateway');
    });

    it('debe retornar un timestamp ISO 8601', () => {
      const result = controller.root();
      expect(result.timestamp).toBeDefined();
      // Verificar que es un formato ISO 8601 válido
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });
});
