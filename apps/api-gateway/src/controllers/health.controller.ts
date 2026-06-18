/**
 * @fileoverview Health endpoint del API Gateway.
 *
 * Responde en la raíz del prefijo (`/api/v1`) para readiness checks y para
 * evitar el 404 al visitar la base de la API. Público (sin guard).
 *
 * @module HealthController
 */

import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  root() {
    return {
      status: 'ok',
      service: 'sgc-api-gateway',
      timestamp: new Date().toISOString(),
    };
  }
}
