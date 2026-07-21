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
import { ImapFlow } from 'imapflow';

import { type ImapAccountConfig } from '../../domain/ports/imap-client.port';

@Injectable()
export class ImapConnectionFactory {
  private readonly logger = new Logger(ImapConnectionFactory.name);

  /**
   * Crea y conecta una instancia ImapFlow para la cuenta indicada.
   * Cada usuario tiene sus propias credenciales (multi-tenant).
   *
   * @param account - Credenciales IMAP (ya descifradas en memoria).
   * @throws {Error} Si la conexión o autenticación falla.
   */
  async create(account: ImapAccountConfig): Promise<ImapFlow> {
    this.logger.debug(
      `Conectando IMAP ${account.host}:${account.port} (${account.email})`,
    );

    const client = new ImapFlow({
      host: account.host,
      port: account.port,
      secure: account.tls,
      auth: { user: account.email, pass: account.password },
      logger: false,
    });

    await client.connect();
    return client;
  }
}
