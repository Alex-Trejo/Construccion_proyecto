/**
 * @fileoverview Detalle de un comprobante.
 *
 * GET /documents/:id (cabecera + ítems + impuestos). "Ver original" pide
 * GET /documents/:id/preview (Pre-Signed URL de MinIO) y abre el archivo.
 *
 * Client Component: usa useParams() (síncrono en cliente en Next 16).
 *
 * @module DocumentDetailPage
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DocumentStatus, type IDocumentDto } from '@sgc/shared';
import { useApi } from '@/lib/api-client';
import { useRoles } from '@/lib/roles';
import { useTranslation } from '@/lib/i18n/language-provider';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { formatDate, formatMoney, statusTone } from '@/lib/format';
import { EditDocumentModal } from '@/components/documents/EditDocumentModal';

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { apiGet, apiPost, apiBlobUrl } = useApi();
  const { isAdmin, isContador, canOperate } = useRoles();
  const canConsolidate = isAdmin || isContador;
  const { t } = useTranslation();

  const [doc, setDoc] = useState<IDocumentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<'consolidate' | 'revalidate' | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<IDocumentDto>(`/documents/${id}`);
      setDoc(data);
    } catch (err) {
      setError(
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : t('documents.detail.loadError'),
      );
    } finally {
      setLoading(false);
    }
  }, [apiGet, id, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Descarga el archivo (RIDE PDF / imagen) por el PROXY autenticado del gateway
  // y crea un object URL (blob:) para previsualizarlo. MinIO nunca se expone.
  useEffect(() => {
    if (!doc?.hasOriginal) return;
    let objectUrl: string | null = null;
    let active = true;
    void (async () => {
      try {
        const url = await apiBlobUrl(`/documents/${id}/file`);
        objectUrl = url;
        if (active) setPreviewUrl(url);
        else URL.revokeObjectURL(url);
      } catch {
        /* silencioso: sin previsualización si falla la descarga */
      }
    })();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc?.hasOriginal, id, apiBlobUrl]);

  const handleAction = async (action: 'consolidate' | 'revalidate') => {
    setActing(action);
    setError(null);
    try {
      await apiPost<IDocumentDto>(`/documents/${id}/${action}`, {});
      await load();
    } catch {
      setError(t('documents.detail.actionError'));
    } finally {
      setActing(null);
    }
  };

  const copyXml = async () => {
    if (!doc?.xmlContent) return;
    await navigator.clipboard.writeText(doc.xmlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/documents" className="brutal-badge bg-secondary">
          {t('common.back')}
        </Link>
        {doc && (
          <div className="flex flex-wrap gap-2">
            {canConsolidate && doc.estado === DocumentStatus.VALIDADO && (
              <Button
                variant="primary"
                onClick={() => void handleAction('consolidate')}
                disabled={acting !== null}
              >
                {acting === 'consolidate'
                  ? t('documents.detail.consolidating')
                  : t('documents.detail.consolidate')}
              </Button>
            )}
            {canOperate && doc.estado === DocumentStatus.INCONSISTENTE && (
              <Button
                variant="dark"
                onClick={() => void handleAction('revalidate')}
                disabled={acting !== null}
              >
                {acting === 'revalidate'
                  ? t('documents.detail.revalidating')
                  : t('documents.detail.revalidate')}
              </Button>
            )}
            {canOperate && doc.estado !== DocumentStatus.CONSOLIDADO && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                {t('documents.edit.button')}
              </Button>
            )}
          </div>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <p className="text-dark/60">{t('documents.loading')}</p>
      ) : !doc ? (
        <p className="text-dark/60">{t('documents.detail.loadError')}</p>
      ) : (
        <>
          <header className="flex flex-col gap-2">
            <span className="brutal-badge w-fit bg-primary">{t('documents.detail.title')}</span>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold">{doc.numeroFactura}</h1>
              <Badge tone={statusTone(doc.estado)}>{doc.estado}</Badge>
              <Badge tone="neutral">{doc.documentType}</Badge>
            </div>
          </header>

          {/* ── Observaciones de la validación ───────────────────────────── */}
          {doc.observaciones && (
            <Alert tone="warning">
              <span className="font-bold">{t('documents.detail.observaciones')}: </span>
              {doc.observaciones}
            </Alert>
          )}

          {/* ── Cabecera (encabezado de la factura) ──────────────────────── */}
          <div className="brutal-card-sm grid gap-4 bg-white p-6 sm:grid-cols-2">
            <Info label={t('documents.th.ruc')} value={doc.rucEmisor} mono />
            <Info label={t('documents.th.razon')} value={doc.razonSocialEmisor ?? '—'} />
            <Info label={t('documents.form.clave')} value={doc.claveAcceso ?? '—'} mono />
            <Info label={t('documents.th.fecha')} value={formatDate(doc.fechaEmision)} />
            <Info label={t('documents.detail.subtotal')} value={formatMoney(doc.subtotal)} mono />
            <Info label={t('documents.detail.iva')} value={formatMoney(doc.iva)} mono />
            <Info label={t('documents.detail.total')} value={formatMoney(doc.total)} mono />
          </div>

          {/* ── Ítems ────────────────────────────────────────────────────── */}
          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-bold">{t('documents.detail.items')}</h2>
            {doc.items.length === 0 ? (
              <p className="text-dark/60">{t('documents.detail.noItems')}</p>
            ) : (
              <div className="brutal-card overflow-x-auto bg-white p-2">
                <table className="brutal-table">
                  <thead>
                    <tr>
                      <th>{t('documents.form.item.desc')}</th>
                      <th>{t('documents.form.item.qty')}</th>
                      <th>{t('documents.form.item.price')}</th>
                      <th>{t('documents.form.item.total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.descripcion}</td>
                        <td className="font-mono">{item.cantidad}</td>
                        <td className="font-mono">{formatMoney(item.precioUnitario)}</td>
                        <td className="font-mono">{formatMoney(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Impuestos ────────────────────────────────────────────────── */}
          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-bold">{t('documents.detail.taxes')}</h2>
            {doc.taxes.length === 0 ? (
              <p className="text-dark/60">{t('documents.detail.noTaxes')}</p>
            ) : (
              <div className="brutal-card overflow-x-auto bg-white p-2">
                <table className="brutal-table">
                  <thead>
                    <tr>
                      <th>{t('documents.detail.tax.codigo')}</th>
                      <th>{t('documents.detail.tax.tarifa')}</th>
                      <th>{t('documents.detail.tax.base')}</th>
                      <th>{t('documents.detail.tax.valor')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.taxes.map((tax) => (
                      <tr key={tax.id}>
                        <td className="font-mono">{tax.codigo}</td>
                        <td className="font-mono">{tax.tarifa}%</td>
                        <td className="font-mono">{formatMoney(tax.baseImponible)}</td>
                        <td className="font-mono">{formatMoney(tax.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Previsualización del PDF (RIDE) desde MinIO ──────────────── */}
          {previewUrl && (
            <section className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-bold">{t('documents.detail.preview')}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPreview((v) => !v)}
                    className="brutal-badge bg-primary"
                  >
                    {showPreview
                      ? t('documents.detail.previewHide')
                      : t('documents.detail.previewShow')}
                  </button>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="brutal-badge bg-secondary"
                  >
                    {t('documents.detail.openTab')}
                  </a>
                </div>
              </div>
              {showPreview && (
                <iframe
                  title={t('documents.detail.preview')}
                  src={previewUrl}
                  className="h-[600px] w-full rounded-xl border-2 border-black bg-white"
                />
              )}
            </section>
          )}

          {/* ── XML del SRI ──────────────────────────────────────────────── */}
          {doc.xmlContent && (
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-bold">{t('documents.detail.xml')}</h2>
                <button onClick={() => void copyXml()} className="brutal-badge bg-secondary">
                  {copied ? t('documents.detail.copied') : t('documents.detail.copyXml')}
                </button>
              </div>
              <pre className="brutal-card-sm max-h-96 overflow-auto bg-dark p-4 text-xs text-white">
                {doc.xmlContent}
              </pre>
            </section>
          )}
        </>
      )}

      <EditDocumentModal
        doc={editing ? doc : null}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          void load();
        }}
      />
    </div>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-dark/60">{label}</p>
      <p className={`mt-1 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
