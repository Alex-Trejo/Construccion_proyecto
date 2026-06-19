/**
 * @fileoverview Módulo de Configuración IMAP por usuario (ms-core).
 * @module ImapConfigModule
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IMAP_CONFIG_REPOSITORY_PORT } from './domain/ports/imap-config.repository.port';
import { ImapConfigOrmEntity } from './infrastructure/persistence/imap-config.orm-entity';
import { TypeOrmImapConfigRepository } from './infrastructure/persistence/typeorm-imap-config.repository';
import {
  SaveImapConfigUseCase,
  ListActiveImapConfigsUseCase,
} from './application/imap-config.use-cases';
import { ImapConfigTcpController } from './presentation/imap-config-tcp.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ImapConfigOrmEntity])],
  controllers: [ImapConfigTcpController],
  providers: [
    {
      provide: IMAP_CONFIG_REPOSITORY_PORT,
      useClass: TypeOrmImapConfigRepository,
    },
    SaveImapConfigUseCase,
    ListActiveImapConfigsUseCase,
  ],
})
export class ImapConfigModule {}
