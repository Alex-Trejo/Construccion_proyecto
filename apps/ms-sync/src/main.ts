/**
 * @fileoverview Bootstrap de ms-sync (Worker IMAP).
 *
 * ms-sync es a la vez:
 *   - EMISOR de eventos TCP hacia ms-core (ClientProxy en el módulo).
 *   - SERVIDOR TCP: escucha TRIGGER_SYNC del api-gateway para disparar un
 *     escaneo IMAP a demanda (sin esperar al cron).
 *   - Worker CRON: el ScheduleModule sigue haciendo el polling periódico.
 *
 * Se crea una app estándar (para inicializar ConfigModule y cargar el .env)
 * pero NO se abre puerto HTTP: solo se levanta el transporte TCP como servidor.
 * Este es el mismo patrón que usa ms-core.
 *
 * Fail-Fast: Si falta una variable de entorno, crashea.
 *
 * @module main
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';

import { AppModule } from './app.module';
import { createAppLogger } from './observability/loki-logger';

async function bootstrap(): Promise<void> {
  const logger = new Logger('MsSync:Bootstrap');

  // Crear la app (inicializa ConfigModule → carga el .env en process.env).
  // No se llama a app.listen(): ms-sync no expone HTTP.
  const app = await NestFactory.create(AppModule, {
    logger: createAppLogger('ms-sync'),
  });

  const config = app.get(ConfigService);
  const host = config.getOrThrow<string>('MS_SYNC_TCP_HOST');
  const port = config.getOrThrow<number>('MS_SYNC_TCP_PORT');

  // Servidor TCP: recibe TRIGGER_SYNC del gateway y corre el cron internamente.
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host, port },
  });

  // Habilitar shutdown hooks para cerrar conexiones IMAP limpiamente.
  app.enableShutdownHooks();

  await app.startAllMicroservices();

  logger.log(`🔄 ms-sync (Worker IMAP) escuchando TCP en ${host}:${port}`);
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
