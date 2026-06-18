/**
 * @fileoverview Handler TCP — Sincronización de identidad Keycloak → sgc_db.
 *
 * Escucha IDENTITY_PATTERNS.SYNC_USER emitido por el api-gateway
 * en cada petición autenticada. Realiza upsert de:
 *   1. Persona (nombres, apellidos, email del JWT)
 *   2. Usuario (keycloak_id, FK persona, FK rol, estado, ultimo_acceso)
 *
 * Es idempotente: si el usuario ya existe, actualiza ultimo_acceso.
 *
 * @module IdentitySyncHandler
 */

import { Controller, Logger } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IDENTITY_PATTERNS } from '@sgc/shared';

import { PersonaOrmEntity } from '../../infrastructure/persistence/persona.orm-entity';
import { UsuarioOrmEntity } from '../../infrastructure/persistence/usuario.orm-entity';
import { RolOrmEntity } from '../../infrastructure/persistence/rol.orm-entity';

/** Payload que envía el api-gateway con los claims del JWT. */
interface SyncUserPayload {
  readonly keycloakId: string;
  readonly username: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly roles: ReadonlyArray<string>;
}

@Controller()
export class IdentitySyncHandler {
  private readonly logger = new Logger(IdentitySyncHandler.name);

  constructor(
    @InjectRepository(PersonaOrmEntity)
    private readonly personaRepo: Repository<PersonaOrmEntity>,

    @InjectRepository(UsuarioOrmEntity)
    private readonly usuarioRepo: Repository<UsuarioOrmEntity>,

    @InjectRepository(RolOrmEntity)
    private readonly rolRepo: Repository<RolOrmEntity>,
  ) {}

  // Se emite con client.emit() desde el gateway → handler de EVENTO
  // (fire-and-forget). El valor de retorno se ignora en eventos.
  @EventPattern(IDENTITY_PATTERNS.SYNC_USER)
  async syncUser(payload: SyncUserPayload): Promise<{ synced: boolean }> {
    try {
      const persona = await this.syncPersona(payload);

      const rol = await this.getPrimaryRole(payload.roles);
      if (!rol) {
        return { synced: false };
      }

      await this.syncUsuario(payload, persona.id, rol.id);

      return { synced: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error sincronizando usuario ${payload.username}: ${msg}`);
      return { synced: false };
    }
  }

  private async syncPersona(payload: SyncUserPayload): Promise<PersonaOrmEntity> {
    let persona = await this.personaRepo.findOne({
      where: { email: payload.email },
    });

    if (!persona) {
      try {
        persona = this.personaRepo.create({
          cedula: null,
          nombres: payload.firstName || payload.username,
          apellidos: payload.lastName || '',
          email: payload.email,
        });
        persona = await this.personaRepo.save(persona);
        this.logger.log(`👤 Persona creada: ${persona.nombres} ${persona.apellidos}`);
      } catch (error: any) {
        if (error.code === '23505') {
          persona = await this.personaRepo.findOneOrFail({ where: { email: payload.email } });
        } else {
          throw error;
        }
      }
    } else {
      persona.nombres = payload.firstName || persona.nombres;
      persona.apellidos = payload.lastName || persona.apellidos;
      await this.personaRepo.save(persona);
    }

    return persona;
  }

  private async getPrimaryRole(roles: ReadonlyArray<string>): Promise<RolOrmEntity | null> {
    const primaryRoleName = roles.find((r) =>
      ['Administrador', 'Contador', 'Asistente'].includes(r),
    ) ?? 'Asistente';

    const rol = await this.rolRepo.findOne({
      where: { nombreRol: primaryRoleName },
    });

    if (!rol) {
      this.logger.warn(`Rol "${primaryRoleName}" no encontrado en BD. Omitiendo sync.`);
    }

    return rol;
  }

  private async syncUsuario(payload: SyncUserPayload, personaId: string, rolId: string): Promise<void> {
    let usuario = await this.usuarioRepo.findOne({
      where: { keycloakId: payload.keycloakId },
    });

    if (!usuario) {
      try {
        usuario = this.usuarioRepo.create({
          keycloakId: payload.keycloakId,
          username: payload.username,
          idPersona: personaId,
          idRol: rolId,
          estado: true,
          ultimoAcceso: new Date(),
        });
        await this.usuarioRepo.save(usuario);
        this.logger.log(`🔗 Usuario sincronizado: ${payload.username}`);
      } catch (error: any) {
        if (error.code === '23505') {
          usuario = await this.usuarioRepo.findOneOrFail({ where: { keycloakId: payload.keycloakId } });
          usuario.ultimoAcceso = new Date();
          await this.usuarioRepo.save(usuario);
        } else {
          throw error;
        }
      }
    } else {
      usuario.ultimoAcceso = new Date();
      usuario.idRol = rolId;
      usuario.username = payload.username;
      await this.usuarioRepo.save(usuario);
    }
  }
}
