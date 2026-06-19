/**
 * @fileoverview Caso de uso — Auto-provisionar Proveedor y Compañía.
 *
 * Flujo:
 *   1. Recibe un XML sanitizado (ParsedSriDocument).
 *   2. Extrae el RUC del emisor (Proveedor) y del receptor (Compañía).
 *   3. Si el Proveedor no existe en BD → consulta el catastro del SRI
 *      vía SriRestApiPort → crea el Proveedor usando SupplierFactory.
 *   4. Si la Compañía receptora no existe → la crea igualmente.
 *
 * Este caso de uso cierra el ciclo: TXT → XML → Entidades en BD.
 *
 * @module AutoProvisionEntitiesUseCase
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupplierType, TaxRegime, type ICreateSupplierDto } from '@sgc/shared';

import { type ParsedSriDocument } from '../../domain/ports/xml-sri-parser.port';
import {
  type SriRestApiPort,
  SRI_REST_API_PORT,
  type SriContributorData,
} from '../../domain/ports/sri-rest-api.port';
import {
  type CompanyRepositoryPort,
  COMPANY_REPOSITORY_PORT,
} from '../../domain/ports/company-repository.port';
import { Company } from '../../domain/entities/company.entity';
import {
  type SupplierRepositoryPort,
  SUPPLIER_REPOSITORY_PORT,
} from '../../../supplier/domain/ports/supplier-repository.port';
import { SupplierFactory } from '../../../supplier/domain/factories/supplier.factory';
import { Ruc } from '../../../supplier/domain/value-objects/ruc.vo';

/** Resultado del auto-aprovisionamiento. */
export interface AutoProvisionResult {
  readonly supplierCreated: boolean;
  readonly supplierRuc: string;
  readonly supplierDisplayName: string | null;
  readonly companyCreated: boolean;
  readonly companyRuc: string;
}

@Injectable()
export class AutoProvisionEntitiesUseCase {
  private readonly logger = new Logger(AutoProvisionEntitiesUseCase.name);

  constructor(
    @Inject(SRI_REST_API_PORT)
    private readonly sriRestApi: SriRestApiPort,

    @Inject(SUPPLIER_REPOSITORY_PORT)
    private readonly supplierRepo: SupplierRepositoryPort,

    @Inject(COMPANY_REPOSITORY_PORT)
    private readonly companyRepo: CompanyRepositoryPort,
  ) {}

  /**
   * Auto-aprovisiona Proveedor y Compañía a partir de datos del XML.
   *
   * @param parsedDoc - Documento parseado con RUC emisor y receptor.
   * @returns Resultado del aprovisionamiento.
   */
  async execute(
    parsedDoc: ParsedSriDocument,
    ownerId: string | null = null,
  ): Promise<AutoProvisionResult> {
    const issuerRuc = parsedDoc.issuerTaxId;
    const buyerRuc = parsedDoc.buyerTaxId;

    this.logger.log(
      `Auto-provisioning: emisor=${issuerRuc}, receptor=${buyerRuc}`,
    );

    // ── 1. Auto-provisionar Proveedor (Emisor) ────────────────────────────
    let supplierCreated = false;
    let supplierDisplayName: string | null = null;

    // El proveedor auto-provisionado pertenece al dueño del correo (userId
    // inyectado por ms-sync). Si no hay dueño, queda como registro de sistema.
    const systemOwner: string | null = ownerId;
    const existingSupplier = await this.supplierRepo.findByTaxId(
      issuerRuc,
      systemOwner,
    );

    if (!existingSupplier) {
      this.logger.log(`Proveedor ${issuerRuc} no existe. Consultando catastro SRI...`);

      const sriData = await this.sriRestApi.fetchContributorByRuc(issuerRuc);

      if (sriData) {
        const dto = this.mapSriDataToCreateDto(sriData);
        const supplier = SupplierFactory.create(dto, systemOwner);
        await this.supplierRepo.save(supplier);
        supplierCreated = true;
        supplierDisplayName = supplier.getDisplayName();

        this.logger.log(
          `✅ Proveedor auto-creado: ${supplierDisplayName} (${issuerRuc})`,
        );
      } else {
        this.logger.warn(
          `Proveedor ${issuerRuc} no encontrado en catastro SRI. Se debe crear manualmente.`,
        );
      }
    } else {
      supplierDisplayName = existingSupplier.getDisplayName();
      this.logger.debug(`Proveedor ${issuerRuc} ya existe: ${supplierDisplayName}`);
    }

    // ── 2. Auto-provisionar Compañía (Receptor) ──────────────────────────
    const companyCreated = await this.provisionCompany(buyerRuc);

    return {
      supplierCreated,
      supplierRuc: issuerRuc,
      supplierDisplayName,
      companyCreated,
      companyRuc: buyerRuc,
    };
  }

  /**
   * Auto-provisiona la Compañía receptora si no existe.
   * Consulta el catastro SRI; si no hay datos, no crea nada.
   *
   * @returns true si se creó una nueva Compañía.
   */
  private async provisionCompany(buyerRuc: string): Promise<boolean> {
    // El receptor debe tener un RUC válido (13 dígitos). Si es consumidor
    // final u otro identificador no válido, se omite silenciosamente.
    let validRuc: Ruc;
    try {
      validRuc = Ruc.create(buyerRuc);
    } catch {
      this.logger.debug(
        `Receptor con identificación no válida (${buyerRuc}). Se omite Compañía.`,
      );
      return false;
    }

    if (await this.companyRepo.existsByTaxId(buyerRuc)) {
      this.logger.debug(`Compañía ${buyerRuc} ya existe.`);
      return false;
    }

    this.logger.log(`Compañía ${buyerRuc} no existe. Consultando catastro SRI...`);
    const sriData = await this.sriRestApi.fetchContributorByRuc(buyerRuc);

    if (!sriData) {
      this.logger.warn(
        `Compañía ${buyerRuc} no encontrada en catastro SRI. Se debe crear manualmente.`,
      );
      return false;
    }

    const now = new Date();
    const company = new Company({
      id: randomUUID(),
      ruc: validRuc,
      razonSocial: sriData.razonSocial,
      nombreComercial: sriData.nombreComercial || sriData.razonSocial,
      direccion: sriData.direccionMatriz,
      obligadoLlevarContabilidad: sriData.obligadoLlevarContabilidad,
      regimen: sriData.regimen ?? TaxRegime.GENERAL,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await this.companyRepo.save(company);
    this.logger.log(`✅ Compañía auto-creada: ${company.razonSocial} (${buyerRuc})`);
    return true;
  }

  /**
   * Mapea datos del catastro SRI al DTO de creación de Proveedor.
   * Determina si es Persona Natural o Jurídica basándose en el tipo
   * de contribuyente reportado por el SRI.
   */
  private mapSriDataToCreateDto(sriData: SriContributorData): ICreateSupplierDto {
    const isNatural =
      sriData.tipoContribuyente === 'PERSONA_NATURAL';

    if (isNatural) {
      // Intentar separar nombre y apellido de la razón social
      const { firstName, lastName } = this.splitName(sriData.razonSocial);

      return {
        supplierType: SupplierType.PERSONA_NATURAL,
        taxId: sriData.ruc,
        email: '',
        phone: '',
        address: sriData.direccionMatriz,
        firstName,
        lastName,
        cedula: sriData.ruc.substring(0, 10),
      };
    }

    return {
      supplierType: SupplierType.PERSONA_JURIDICA,
      taxId: sriData.ruc,
      email: '',
      phone: '',
      address: sriData.direccionMatriz,
      businessName: sriData.razonSocial,
      tradeName: sriData.nombreComercial || sriData.razonSocial,
      legalRepresentative: '',
    };
  }

  /**
   * Intenta separar "APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2" en firstName/lastName.
   * Formato estándar del SRI para personas naturales.
   */
  private splitName(fullName: string): { firstName: string; lastName: string } {
    const parts = fullName.trim().split(/\s+/);

    if (parts.length <= 1) {
      return { firstName: fullName, lastName: '' };
    }

    if (parts.length === 2) {
      return { firstName: parts[1], lastName: parts[0] };
    }

    // Convención SRI: primeros 2 son apellidos, resto son nombres
    const lastName = parts.slice(0, 2).join(' ');
    const firstName = parts.slice(2).join(' ');
    return { firstName: firstName || parts[1], lastName };
  }
}
