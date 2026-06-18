/**
 * @fileoverview Bootstrap de ms-sync (Worker IMAP).
 *
 * Microservicio PURO: no expone HTTP, no necesita puerto HTTP.
 * Solo se conecta vía TCP como CLIENTE hacia ms-core.
 *
 * La app se levanta como una NestFactory estándar (no como microservice)
 * porque ms-sync es un EMISOR de eventos TCP, no un receptor.
 * El ScheduleModule se encarga del polling automático.
 *
 * Fail-Fast: Si falta una variable de entorno, crashea.
 *
 * @module main
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';

import { AppModule } from './app.module';
import { createAppLogger } from './observability/loki-logger';

async function bootstrap(): Promise<void> {
  const logger = new Logger('MsSync:Bootstrap');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: createAppLogger('ms-sync'),
  });

  // Habilitar shutdown hooks para cerrar conexiones IMAP limpiamente
  app.enableShutdownHooks();

  logger.log('🔄 ms-sync (Worker IMAP) iniciado correctamente');
  logger.log('📧 Polling IMAP programado — esperando ciclo de sincronización...');
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger('MsSync:FatalError');
  logger.error('❌ ms-sync no pudo arrancar. Error fatal:');
  logger.error(
    error instanceof Error ? (error.stack ?? error.message) : String(error),
  );
  process.exit(1);
});
