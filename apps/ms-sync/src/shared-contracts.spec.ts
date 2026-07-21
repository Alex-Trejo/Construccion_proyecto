/**
 * @fileoverview Tests unitarios — Constantes de Message Patterns (@sgc/shared).
 *
 * Verifica que todos los patrones de mensajería TCP están definidos
 * con los valores esperados y no se pierden en refactorings.
 */

import {
  SUPPLIER_PATTERNS,
  DOCUMENT_PATTERNS,
  SYNC_PATTERNS,
  COMMUNICATION_PATTERNS,
  IDENTITY_PATTERNS,
  MICROSERVICE_TOKENS,
} from '@sgc/shared';

describe('@sgc/shared — Message Patterns', () => {
  // ── Supplier Patterns ────────────────────────────────────────────────
  describe('SUPPLIER_PATTERNS', () => {
    it('debe tener todos los patrones definidos', () => {
      expect(SUPPLIER_PATTERNS.CREATE).toBe('CORE_SUPPLIER_CREATE');
      expect(SUPPLIER_PATTERNS.FIND_ALL).toBe('CORE_SUPPLIER_FIND_ALL');
      expect(SUPPLIER_PATTERNS.FIND_BY_ID).toBe('CORE_SUPPLIER_FIND_BY_ID');
      expect(SUPPLIER_PATTERNS.FIND_BY_TAX_ID).toBe('CORE_SUPPLIER_FIND_BY_TAX_ID');
      expect(SUPPLIER_PATTERNS.UPDATE).toBe('CORE_SUPPLIER_UPDATE');
      expect(SUPPLIER_PATTERNS.DEACTIVATE).toBe('CORE_SUPPLIER_DEACTIVATE');
    });

    it('debe tener exactamente 6 patrones', () => {
      expect(Object.keys(SUPPLIER_PATTERNS)).toHaveLength(6);
    });
  });

  // ── Document Patterns ────────────────────────────────────────────────
  describe('DOCUMENT_PATTERNS', () => {
    it('debe tener todos los patrones definidos', () => {
      expect(DOCUMENT_PATTERNS.UPLOAD).toBe('CORE_DOCUMENT_UPLOAD');
      expect(DOCUMENT_PATTERNS.UPLOAD_BATCH_TXT).toBe('CORE_DOCUMENT_UPLOAD_BATCH_TXT');
      expect(DOCUMENT_PATTERNS.FIND_ALL).toBe('CORE_DOCUMENT_FIND_ALL');
      expect(DOCUMENT_PATTERNS.FIND_BY_ID).toBe('CORE_DOCUMENT_FIND_BY_ID');
      expect(DOCUMENT_PATTERNS.UPDATE_STATUS).toBe('CORE_DOCUMENT_UPDATE_STATUS');
    });

    it('debe tener exactamente 17 patrones', () => {
      expect(Object.keys(DOCUMENT_PATTERNS)).toHaveLength(17);
    });
  });

  // ── Sync Patterns ────────────────────────────────────────────────────
  describe('SYNC_PATTERNS', () => {
    it('debe tener todos los patrones definidos', () => {
      expect(SYNC_PATTERNS.TRIGGER_SYNC).toBe('SYNC_IMAP_TRIGGER');
      expect(SYNC_PATTERNS.GET_STATUS).toBe('SYNC_IMAP_GET_STATUS');
      expect(SYNC_PATTERNS.DOCUMENT_RECEIVED).toBe('SYNC_DOCUMENT_RECEIVED');
    });
  });

  // ── Communication Patterns ───────────────────────────────────────────
  describe('COMMUNICATION_PATTERNS', () => {
    it('debe tener todos los patrones definidos', () => {
      expect(COMMUNICATION_PATTERNS.LIST_EMAILS).toBe('CORE_COMMUNICATION_LIST_EMAILS');
      expect(COMMUNICATION_PATTERNS.GET_EMAIL_DETAIL).toBe('CORE_COMMUNICATION_GET_EMAIL_DETAIL');
      expect(COMMUNICATION_PATTERNS.GET_ATTACHMENT_URL).toBe('CORE_COMMUNICATION_GET_ATTACHMENT_URL');
    });
  });

  // ── Identity Patterns ────────────────────────────────────────────────
  describe('IDENTITY_PATTERNS', () => {
    it('debe tener el patrón de sync de usuario', () => {
      expect(IDENTITY_PATTERNS.SYNC_USER).toBe('CORE_IDENTITY_SYNC_USER');
    });
  });

  // ── Microservice Tokens ──────────────────────────────────────────────
  describe('MICROSERVICE_TOKENS', () => {
    it('debe tener tokens para ms-core y ms-sync', () => {
      expect(MICROSERVICE_TOKENS.MS_CORE_CLIENT).toBe('MS_CORE_CLIENT');
      expect(MICROSERVICE_TOKENS.MS_SYNC_CLIENT).toBe('MS_SYNC_CLIENT');
    });
  });
});
