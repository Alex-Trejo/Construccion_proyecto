/**
 * @fileoverview Módulo Comprobantes — listado paginado + acciones de ingesta.
 *
 * Consume GET /documents (paginado por dueño). Acciones:
 *   - Subir foto (OCR)   → OcrUploadModal
 *   - Carga masiva TXT   → TxtUploadModal
 *   - Nuevo manual       → ManualDocumentModal
 *   - Exportar XLSX      → GET /documents/export (descarga binaria)
 *
 * @module DocumentsPage
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { IImportErrorDto, IPaginatedDocuments } from '@sgc/shared';
import { useApi } from '@/lib/api-client';
import { useRoles } from '@/lib/roles';
import { useTranslation } from '@/lib/i18n/language-provider';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { formatDate, formatMoney, statusTone } from '@/lib/format';
import { OcrUploadModal } from '@/components/documents/OcrUploadModal';
import { TxtUploadModal } from '@/components/documents/TxtUploadModal';
import { ManualDocumentModal } from '@/components/documents/ManualDocumentModal';

const PAGE_SIZE = 10;

type ActiveModal = 'ocr' | 'txt' | 'manual' | null;

export default function DocumentsPage() {
  const { apiGet, apiPost, apiDownload } = useApi();
  const { t } = useTranslation();
  const { canOperate } = useRoles();
  const canWrite = canOperate;

  const [page, setPage] = useState(1);
  const [result, setResult] = useState<IPaginatedDocuments | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modal, setModal] = useState<ActiveModal>(null);
  const [exporting, setExporting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [importErrors, setImportErrors] = useState<ReadonlyArray<IImportErrorDto>>([]);
  // Cada incremento reinicia el polling (tras subir un TXT, el SRI se procesa
  // en segundo plano y la lista se va llenando).
  const [pollToken, setPollToken] = useState(0);

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<IPaginatedDocuments>(
          `/documents?page=${p}&limit=${PAGE_SIZE}`,
        );
        setResult(data);
      } catch (err) {
        setError(
          typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : t('documents.loadError'),
        );
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [apiGet, t],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(page);
  }, [load, page]);

  // Polling tras subir un TXT: refresca la lista cada 5s (~2 min) mientras el
  // backend importa los comprobantes desde el SRI en segundo plano.
  useEffect(() => {
    if (pollToken === 0) return;
    let ticks = 0;
    const interval = setInterval(() => {
      ticks += 1;
      void load(1);
      if (ticks >= 24) clearInterval(interval);
    }, 5000);
    return () => clearInterval(interval);
  }, [pollToken, load]);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      await apiDownload('/documents/export', 'comprobantes.xlsx');
    } catch {
      setError(t('documents.exportError'));
    } finally {
      setExporting(false);
    }
  };

  const handleValidatePending = async () => {
    setValidating(true);
    setError(null);
    try {
      const res = await apiPost<{
        validated: number;
        validados: number;
        inconsistentes: number;
      }>('/documents/validate-pending', {});
      setFeedback(t('documents.validatedResult', res));
      await load(page);
    } catch (err) {
      setError(
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : t('common.unexpectedError'),
      );
    } finally {
      setValidating(false);
    }
  };

  const loadErrors = useCallback(async () => {
    try {
      const rows = await apiGet<IImportErrorDto[]>('/documents/import-errors');
      setImportErrors(rows);
    } catch {
      setError(t('documents.importErrors.loadError'));
    }
  }, [apiGet, t]);

  const toggleErrors = async () => {
    const next = !showErrors;
    setShowErrors(next);
    if (next) await loadErrors();
  };

  const handleRetryImports = async () => {
    setValidating(true);
    setError(null);
    try {
      const res = await apiPost<{ retried: number }>('/documents/retry-imports', {});
      setFeedback(t('documents.importErrors.retryResult', res));
      setPollToken((n) => n + 1);
      await loadErrors();
    } catch (err) {
      setError(
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : t('common.unexpectedError'),
      );
    } finally {
      setValidating(false);
    }
  };

  const onSaved = () => {
    setPage(1);
    void load(1);
  };

  const totalPages = result?.totalPages ?? 1;
  const isEmpty = !result || result.data.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <span className="brutal-badge w-fit bg-primary">{t('documents.badge')}</span>
          <h1 className="text-3xl font-bold">{t('documents.title')}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {canWrite && (
            <>
              <Button variant="primary" onClick={() => setModal('ocr')}>
                {t('documents.uploadPhoto')}
              </Button>
              <Button variant="dark" onClick={() => setModal('txt')}>
                {t('documents.uploadTxt')}
              </Button>
              <Button variant="secondary" onClick={() => setModal('manual')}>
                {t('documents.newManual')}
              </Button>
            </>
          )}
          {canWrite && (
            <Button
              variant="dark"
              onClick={() => void handleValidatePending()}
              disabled={validating}
            >
              {validating ? t('documents.validating') : t('documents.validatePending')}
            </Button>
          )}
          <Button variant="secondary" onClick={() => void handleExport()} disabled={exporting}>
            {exporting ? t('documents.exporting') : t('documents.export')}
          </Button>
          <Button variant="secondary" onClick={() => void load(page)} disabled={loading}>
            {loading ? t('documents.refreshing') : t('common.refresh')}
          </Button>
          <Button variant="secondary" onClick={() => void toggleErrors()}>
            {showErrors ? t('documents.importErrors.hide') : t('documents.importErrors.show')}
          </Button>
        </div>
      </header>

      {error && <Alert tone="error">{error}</Alert>}
      {feedback && <Alert tone="success">{feedback}</Alert>}

      {showErrors && (
        <div className="brutal-card-sm bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">{t('documents.importErrors.title')}</h2>
            {canWrite && importErrors.some((e) => e.retryable) && (
              <Button
                variant="dark"
                onClick={() => void handleRetryImports()}
                disabled={validating}
              >
                {validating
                  ? t('documents.importErrors.retrying')
                  : t('documents.importErrors.retry')}
              </Button>
            )}
          </div>
          {importErrors.length === 0 ? (
            <p className="text-sm text-dark/60">{t('documents.importErrors.empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="brutal-table">
                <thead>
                  <tr>
                    <th>{t('documents.importErrors.th.tipo')}</th>
                    <th>{t('documents.importErrors.th.clave')}</th>
                    <th>{t('documents.importErrors.th.error')}</th>
                    <th>{t('documents.importErrors.th.fecha')}</th>
                  </tr>
                </thead>
                <tbody>
                  {importErrors.map((e) => (
                    <tr key={e.claveAcceso}>
                      <td>
                        <Badge tone={e.retryable ? 'warning' : 'danger'}>
                          {t(`documents.importErrors.kind.${e.kind}`)}
                        </Badge>
                      </td>
                      <td className="font-mono text-xs">{e.claveAcceso}</td>
                      <td>{e.errorMessage}</td>
                      <td className="whitespace-nowrap">{formatDate(e.fecha)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Table
        headers={[
          t('documents.th.type'),
          t('documents.th.ruc'),
          t('documents.th.razon'),
          t('documents.th.numero'),
          t('documents.th.fecha'),
          t('documents.th.total'),
          t('documents.th.estado'),
          t('documents.th.actions'),
        ]}
        loading={loading}
        isEmpty={isEmpty}
        loadingText={t('documents.loading')}
        emptyText={t('documents.empty')}
      >
        {result?.data.map((doc) => (
          <tr key={doc.id}>
            <td className="font-medium">{doc.documentType}</td>
            <td className="font-mono">{doc.rucEmisor}</td>
            <td>{doc.razonSocialEmisor ?? '—'}</td>
            <td className="font-mono">{doc.numeroFactura}</td>
            <td className="whitespace-nowrap">{formatDate(doc.fechaEmision)}</td>
            <td className="whitespace-nowrap font-mono">{formatMoney(doc.total)}</td>
            <td>
              <Badge tone={statusTone(doc.estado)}>{doc.estado}</Badge>
            </td>
            <td>
              <Link href={`/dashboard/documents/${doc.id}`} className="brutal-badge bg-secondary">
                {t('documents.view')}
              </Link>
            </td>
          </tr>
        ))}
      </Table>

      {result && (
        <Pagination
          page={result.page}
          totalPages={totalPages}
          total={result.total}
          disabled={loading}
          onPageChange={setPage}
        />
      )}

      {/* ── Modales de ingesta ─────────────────────────────────────────────── */}
      <OcrUploadModal
        open={modal === 'ocr'}
        onClose={() => setModal(null)}
        onSaved={onSaved}
      />
      <TxtUploadModal
        open={modal === 'txt'}
        onClose={() => setModal(null)}
        onSaved={() => {
          onSaved();
          // Inicia el polling: el SRI se procesa en segundo plano.
          setPollToken((n) => n + 1);
        }}
      />
      <ManualDocumentModal
        open={modal === 'manual'}
        onClose={() => setModal(null)}
        onSaved={(numero) => {
          setFeedback(t('documents.created', { numero }));
          onSaved();
        }}
      />
    </div>
  );
}
