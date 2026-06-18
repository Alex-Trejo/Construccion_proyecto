/**
 * @fileoverview Módulo Comunicaciones — tabla paginada de correos recibidos.
 *
 * Consume GET /communications (paginado). Al hacer clic en un adjunto, pide
 * GET /communications/:id/attachments/:aid/download que devuelve una
 * Pre-Signed URL de MinIO; el navegador descarga DIRECTO del Object Storage
 * (window.open), sin pasar el buffer por Next.js ni por el gateway.
 *
 * @module CommunicationsPage
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApi } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import type {
  DownloadUrlResult,
  PaginatedEmails,
  ReceivedEmail,
} from '@/lib/types';

const PAGE_SIZE = 10;

export default function CommunicationsPage() {
  const { apiGet } = useApi();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PaginatedEmails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<PaginatedEmails>(
          `/communications?page=${p}&limit=${PAGE_SIZE}`,
        );
        setResult(data);
      } catch (err) {
        const text =
          typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to load communications';
        setError(text);
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [apiGet],
  );

  useEffect(() => {
    void load(page);
  }, [load, page]);

  const handleDownload = async (emailId: string, attachmentId: string) => {
    setDownloading(attachmentId);
    try {
      const res = await apiGet<DownloadUrlResult>(
        `/communications/${emailId}/attachments/${attachmentId}/download`,
      );
      // Descarga directa desde MinIO con la Pre-Signed URL.
      window.open(res.url, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Could not generate the download link.');
    } finally {
      setDownloading(null);
    }
  };

  const totalPages = result?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-2">
          <span className="brutal-badge w-fit bg-primary">Communications</span>
          <h1 className="text-3xl font-bold">Received emails</h1>
        </div>
        <Button variant="secondary" onClick={() => void load(page)}>
          ↻ Refresh
        </Button>
      </header>

      {error && (
        <div className="brutal-card-sm bg-[var(--color-danger)] p-4 font-medium">
          {error}
        </div>
      )}

      <div className="brutal-card overflow-x-auto bg-white p-2">
        <table className="brutal-table">
          <thead>
            <tr>
              <th>From</th>
              <th>Subject</th>
              <th>Date</th>
              <th>Attachments</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4}>Loading…</td>
              </tr>
            ) : !result || result.data.length === 0 ? (
              <tr>
                <td colSpan={4}>No emails received yet.</td>
              </tr>
            ) : (
              result.data.map((email) => (
                <EmailRow
                  key={email.id}
                  email={email}
                  downloading={downloading}
                  onDownload={handleDownload}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-dark/60">
          {result ? `${result.total} emails · page ${result.page} of ${totalPages}` : '—'}
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={loading || page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </Button>
          <Button
            variant="secondary"
            disabled={loading || page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmailRow({
  email,
  downloading,
  onDownload,
}: {
  email: ReceivedEmail;
  downloading: string | null;
  onDownload: (emailId: string, attachmentId: string) => void;
}) {
  return (
    <tr>
      <td className="font-medium">{email.emailFrom}</td>
      <td>{email.emailSubject}</td>
      <td className="whitespace-nowrap">
        {new Date(email.emailDate).toLocaleDateString()}
      </td>
      <td>
        {email.attachments.length === 0 ? (
          <span className="text-dark/40">—</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {email.attachments.map((att) => (
              <button
                key={att.id}
                onClick={() => onDownload(email.id, att.id)}
                disabled={downloading === att.id}
                className="brutal-badge bg-primary transition hover:translate-y-0.5 disabled:opacity-50"
                title={`Download ${att.filename}`}
              >
                {downloading === att.id ? '…' : `↓ ${att.extension.toUpperCase()}`}
              </button>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}
