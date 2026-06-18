/**
 * @fileoverview Bootstrap de ms-core — Microservicio de Negocio.
 *
 * Arquitectura Híbrida:
 * ─────────────────────
 * 1. Servidor HTTP (Express) → Expone /health para readiness probes.
 * 2. Microservicio TCP       → Comunicación inter-servicio con api-gateway.
 *
 * Flujo de arranque:
 * ──────────────────
 * 1. NestFactory.create() instancia AppModule.
 * 2. ConfigModule valida TODAS las variables de entorno con Joi.
 *    → Si falta alguna, el proceso CRASHEA con exit code 1 (Fail-Fast).
 * 3. Se conecta el transporter TCP para escuchar MessagePatterns.
 * 4. Se inicia el servidor HTTP para health checks.
 *
 * REGLA: No existen valores de fallback. ConfigService.getOrThrow()
 * se usa para obtener cada variable, garantizando tipado estricto.
 *
 * @module main
 */

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

import { AppModule } from './app.module';
import { createAppLogger } from './observability/loki-logger';

async function bootstrap(): Promise<void> {
  const logger = new Logger('MS-Core:Bootstrap');

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Crear aplicación HTTP (para health checks y métricas)
  //    La validación Joi de ConfigModule se ejecuta aquí.
  //    Si falta una variable de entorno → excepción → proceso muere.
  // ─────────────────────────────────────────────────────────────────────────
  const app = await NestFactory.create(AppModule, {
    logger: createAppLogger('ms-core'),
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Obtener ConfigService — Sin fallbacks (getOrThrow)
  // ─────────────────────────────────────────────────────────────────────────
  const configService = app.get(ConfigService);

  const tcpHost = configService.getOrThrow<string>('MS_CORE_TCP_HOST');
  const tcpPort = configService.getOrThrow<number>('MS_CORE_TCP_PORT');
  const httpPort = configService.getOrThrow<number>('MS_CORE_HTTP_PORT');

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Conectar Microservicio TCP
  //    El API Gateway enviará mensajes a este host:port usando
  //    ClientProxy con Transport.TCP.
  // ─────────────────────────────────────────────────────────────────────────
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: tcpHost,
      port: tcpPort,
    },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Iniciar todos los transportes y el servidor HTTP
  // ─────────────────────────────────────────────────────────────────────────
  await app.startAllMicroservices();
  await app.listen(httpPort);

  logger.log(
    `🚀 ms-core TCP escuchando en ${tcpHost}:${tcpPort}`,
  );
  logger.log(
    `🩺 ms-core HTTP (health) escuchando en puerto ${httpPort}`,
  );
}

bootstrap().catch((error: Error) => {
  // ─────────────────────────────────────────────────────────────────────────
  // FAIL-FAST: Si bootstrap() falla (ej. validación de env vars),
  // loguear el error y terminar el proceso con código de error.
  // ─────────────────────────────────────────────────────────────────────────
  const logger = new Logger('MS-Core:FatalError');
  logger.error('❌ ms-core no pudo arrancar. Error fatal:');
  logger.error(error.message);
  process.exit(1);
});
