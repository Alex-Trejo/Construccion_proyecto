/**
 * @fileoverview Handler TCP — Espejo de roles de Keycloak en Postgres.
 *
 * Escucha los eventos emitidos por el api-gateway cuando el Administrador
 * crea/elimina roles en Keycloak, y mantiene la tabla `roles` sincronizada.
 *
 * @module RoleSyncHandler
 */

import { Controller, Logger } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IDENTITY_PATTERNS } from '@sgc/shared';

import { RolOrmEntity } from '../../infrastructure/persistence/rol.orm-entity';

interface UpsertRolePayload {
  readonly nombreRol: string;
  readonly descripcion?: string | null;
}

interface DeleteRolePayload {
  readonly nombreRol: string;
}

@Controller()
export class RoleSyncHandler {
  private readonly logger = new Logger(RoleSyncHandler.name);

  constructor(
    @InjectRepository(RolOrmEntity)
    private readonly rolRepo: Repository<RolOrmEntity>,
  ) {}

  @EventPattern(IDENTITY_PATTERNS.UPSERT_ROLE)
  async upsert(payload: UpsertRolePayload): Promise<void> {
    try {
      let rol = await this.rolRepo.findOne({
        where: { nombreRol: payload.nombreRol },
      });
      if (!rol) {
        rol = this.rolRepo.create({
          nombreRol: payload.nombreRol,
          descripcion: payload.descripcion ?? null,
          isActive: true,
        });
        this.logger.log(`🌱 Rol espejado (nuevo): ${payload.nombreRol}`);
      } else {
        rol.descripcion = payload.descripcion ?? rol.descripcion;
        rol.isActive = true;
      }
      await this.rolRepo.save(rol);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error espejando rol ${payload.nombreRol}: ${msg}`);
    }
  }

  @EventPattern(IDENTITY_PATTERNS.DELETE_ROLE)
  async remove(payload: DeleteRolePayload): Promise<void> {
    try {
      await this.rolRepo.update(
        { nombreRol: payload.nombreRol },
        { isActive: false },
      );
      this.logger.log(`🗑️ Rol marcado inactivo: ${payload.nombreRol}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error desactivando rol ${payload.nombreRol}: ${msg}`);
    }
  }
}
