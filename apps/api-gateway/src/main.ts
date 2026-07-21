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
import { RpcHttpExceptionFilter } from './filters/rpc-http-exception.filter';

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

  // Confía en el reverse proxy (Caddy) para leer la IP real del cliente
  // (X-Forwarded-For) → el rate limiting cuenta por cliente, no por el proxy.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // ── CORS ─────────────────────────────────────────────────────────────────
  // En producción se restringe a los orígenes de CORS_ORIGIN (coma-separado).
  // Si no se define (solo dev), se permite cualquier origen.
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  const origin = corsOrigin
    ? corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
    : true;
  if (!corsOrigin && configService.get('NODE_ENV') === 'production') {
    logger.warn(
      '⚠️ CORS_ORIGIN no está definido en producción — se permite CUALQUIER origen. ' +
        'Fija CORS_ORIGIN al dominio real.',
    );
  }
  app.enableCors({ origin, credentials: true });

  // ── Validación global de DTOs (class-validator) ──────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // ── Filtro global: traduce errores de microservicio (TCP) a HTTP claros ──
  app.useGlobalFilters(new RpcHttpExceptionFilter());

  // ── Swagger / OpenAPI (SOLO fuera de producción) ─────────────────────────
  // En producción no se expone la documentación de la API (menos superficie).
  const isProduction = configService.get('NODE_ENV') === 'production';
  if (!isProduction) {
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
  }

  await app.listen(port);
  logger.log(`🚀 API Gateway escuchando en http://localhost:${port}/api/v1`);
  if (!isProduction) {
    logger.log(`📚 Swagger UI: http://localhost:${port}/docs`);
  }
}

bootstrap().catch((error: Error) => {
  const logger = new Logger('APIGateway:FatalError');
  logger.error('❌ API Gateway no pudo arrancar. Error fatal:');
  logger.error(error.message);
  process.exit(1);
});
