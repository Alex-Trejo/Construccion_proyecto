/**
 * @fileoverview Factory Method — Conexión IMAP autenticada.
 *
 * Patrón GoF: Factory Method
 * Encapsula la creación de instancias `ImapFlow` con la configuración
 * de conexión validada por Fail-Fast (ConfigService).
 *
 * Cada llamada a create() retorna una NUEVA instancia autenticada.
 * La conexión debe cerrarse explícitamente con logout().
 *
 * @module ImapConnectionFactory
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImapFlow } from 'imapflow';

/** Opciones tipadas para la conexión IMAP. */
export interface ImapConnectionOptions {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly auth: {
    readonly user: string;
    readonly pass: string;
  };
}

@Injectable()
export class ImapConnectionFactory {
  private readonly logger = new Logger(ImapConnectionFactory.name);
  private readonly options: ImapConnectionOptions;

  constructor(private readonly configService: ConfigService) {
    this.options = {
      host: this.configService.getOrThrow<string>('IMAP_HOST'),
      port: this.configService.getOrThrow<number>('IMAP_PORT'),
      secure: this.configService.getOrThrow<boolean>('IMAP_TLS'),
      auth: {
        user: this.configService.getOrThrow<string>('IMAP_USER'),
        pass: this.configService.getOrThrow<string>('IMAP_PASSWORD'),
      },
    };

    this.logger.log(
      `IMAP Factory configurada: ${this.options.host}:${this.options.port} ` +
      `(TLS: ${String(this.options.secure)}, user: ${this.options.auth.user})`,
    );
  }

  /**
   * Crea y conecta una nueva instancia ImapFlow autenticada.
   *
   * @returns Instancia ImapFlow conectada y autenticada.
   * @throws {Error} Si la conexión o autenticación falla.
   */
  async create(): Promise<ImapFlow> {
    this.logger.debug('Creando nueva conexión IMAP...');

    const client = new ImapFlow({
      host: this.options.host,
      port: this.options.port,
      secure: this.options.secure,
      auth: {
        user: this.options.auth.user,
        pass: this.options.auth.pass,
      },
      logger: false, // Deshabilitamos el logger interno de ImapFlow
    });

    await client.connect();

    this.logger.log('✅ Conexión IMAP establecida exitosamente');
    return client;
  }
}
