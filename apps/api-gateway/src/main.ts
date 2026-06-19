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
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  // ── Swagger / OpenAPI ────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SGC — API Gateway')
    .setDescription(
      'Sistema de Gestión de Comprobantes. Pulsa "Authorize" y pega tu ' +
        'access_token de Keycloak (Bearer) para probar las rutas protegidas.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('/api/v1')
    .build();
  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDoc, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);
  logger.log(`🚀 API Gateway escuchando en http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger UI: http://localhost:${port}/docs`);
}

bootstrap().catch((error: Error) => {
  const logger = new Logger('APIGateway:FatalError');
  logger.error('❌ API Gateway no pudo arrancar. Error fatal:');
  logger.error(error.message);
  process.exit(1);
});
