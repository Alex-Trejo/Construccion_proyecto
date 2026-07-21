/**
 * @fileoverview Módulo de Identidad (ms-core).
 *
 * Encapsula las Shadow Tables de Keycloak (personas, usuarios, roles)
 * y el servicio de seed para datos de catálogo (tipo_comprobantes).
 *
 * Responsabilidades:
 *   - Registrar entidades ORM para forFeature
 *   - Ejecutar seed de datos iniciales al arrancar
 *   - Exponer el handler TCP para sincronizar usuarios
 *
 * @module IdentityModule
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RolOrmEntity } from './infrastructure/persistence/rol.orm-entity';
import { PersonaOrmEntity } from './infrastructure/persistence/persona.orm-entity';
import { UsuarioOrmEntity } from './infrastructure/persistence/usuario.orm-entity';
import { TipoComprobanteOrmEntity } from '../document/infrastructure/persistence/tipo-comprobante.orm-entity';

import { SeedService } from './infrastructure/seed.service';
import { IdentitySyncHandler } from './application/handlers/identity-sync.handler';
import { RoleSyncHandler } from './application/handlers/role-sync.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RolOrmEntity,
      PersonaOrmEntity,
      UsuarioOrmEntity,
      TipoComprobanteOrmEntity,
    ]),
  ],
  controllers: [IdentitySyncHandler, RoleSyncHandler],
  providers: [SeedService],
})
export class IdentityModule {}
