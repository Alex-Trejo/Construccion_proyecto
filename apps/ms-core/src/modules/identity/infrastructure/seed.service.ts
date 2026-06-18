/**
 * @fileoverview Servicio de Seed — Datos iniciales de catálogo.
 *
 * Se ejecuta al arrancar ms-core (onModuleInit). Inserta los registros
 * base que requieren las tablas de catálogo si no existen.
 *
 * Tablas que alimenta:
 *   - roles: Administrador, Contador, Asistente (espejo de Keycloak)
 *   - tipo_comprobantes: Los 5 tipos del SRI
 *
 * Usa upsert (INSERT ... ON CONFLICT DO NOTHING) para ser idempotente.
 *
 * @module SeedService
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RolOrmEntity } from './persistence/rol.orm-entity';
import { TipoComprobanteOrmEntity } from '../../document/infrastructure/persistence/tipo-comprobante.orm-entity';

/** Roles definidos en el realm Keycloak (realm-sgc-export.json). */
const SEED_ROLES = [
  { nombreRol: 'Administrador', descripcion: 'Acceso total al sistema: gestión de usuarios, proveedores, comprobantes y configuraciones.' },
  { nombreRol: 'Contador', descripcion: 'Gestión de comprobantes: carga, validación, consolidación de reportes fiscales.' },
  { nombreRol: 'Asistente', descripcion: 'Consulta de comprobantes y proveedores. Sin permisos de escritura ni consolidación.' },
];

/** Tipos de comprobante del SRI ecuatoriano (código de 2 dígitos). */
const SEED_TIPOS_COMPROBANTE = [
  { codigoSri: '01', nombreTipoComprobante: 'Factura', descripcion: 'Comprobante de venta de bienes o servicios.' },
  { codigoSri: '04', nombreTipoComprobante: 'Nota de Crédito', descripcion: 'Modifica una factura emitida previamente (devolución, descuento).' },
  { codigoSri: '05', nombreTipoComprobante: 'Nota de Débito', descripcion: 'Incrementa el valor de una factura emitida previamente.' },
  { codigoSri: '06', nombreTipoComprobante: 'Guía de Remisión', descripcion: 'Acompaña el traslado de mercancías.' },
  { codigoSri: '07', nombreTipoComprobante: 'Comprobante de Retención', descripcion: 'Retención de impuestos en la fuente.' },
];

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(RolOrmEntity)
    private readonly rolRepo: Repository<RolOrmEntity>,

    @InjectRepository(TipoComprobanteOrmEntity)
    private readonly tipoComprobanteRepo: Repository<TipoComprobanteOrmEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedRoles();
    await this.seedTiposComprobante();
  }

  private async seedRoles(): Promise<void> {
    for (const seed of SEED_ROLES) {
      const exists = await this.rolRepo.findOne({
        where: { nombreRol: seed.nombreRol },
      });

      if (!exists) {
        const entity = this.rolRepo.create(seed);
        await this.rolRepo.save(entity);
        this.logger.log(`🌱 Rol creado: ${seed.nombreRol}`);
      }
    }
  }

  private async seedTiposComprobante(): Promise<void> {
    for (const seed of SEED_TIPOS_COMPROBANTE) {
      const exists = await this.tipoComprobanteRepo.findOne({
        where: { codigoSri: seed.codigoSri },
      });

      if (!exists) {
        const entity = this.tipoComprobanteRepo.create(seed);
        await this.tipoComprobanteRepo.save(entity);
        this.logger.log(`🌱 Tipo comprobante creado: ${seed.nombreTipoComprobante}`);
      }
    }
  }
}
