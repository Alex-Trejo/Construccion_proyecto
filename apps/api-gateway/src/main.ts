/**
 * @fileoverview Bootstrap del API Gateway.
 *
 * Servidor HTTP puro (sin microservicio TCP).
 * Actúa como puerta de entrada: valida JWT (Keycloak) y enruta
 * peticiones a ms-core y ms-sync vía ClientProxy TCP.
 *
 * Fail-Fast: Si falta una variable de entorno, crashea.
 *
 * @module main
 */

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';
import { createAppLogger } from './observability/loki-logger';

async function bootstrap(): Promise<void> {
  const logger = new Logger('APIGateway:Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: createAppLogger('api-gateway'),
  });

  // ── Config sin fallbacks ─────────────────────────────────────────────────
  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('API_GATEWAY_PORT');

  // ── Prefijo global de API ────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // ── Validación global de DTOs (class-validator) ──────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  await app.listen(port);
  logger.log(`🚀 API Gateway escuchando en http://localhost:${port}/api/v1`);
}

bootstrap().catch((error: Error) => {
  const logger = new Logger('APIGateway:FatalError');
  logger.error('❌ API Gateway no pudo arrancar. Error fatal:');
  logger.error(error.message);
  process.exit(1);
});
