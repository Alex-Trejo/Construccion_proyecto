/**
 * @fileoverview Modal de carga masiva desde archivo TXT del SRI.
 * POST /documents/bulk-txt (multipart) → ProcessTxtBatchResult (resumen).
 * @module documents/TxtUploadModal
 */

'use client';

import { useState } from 'react';
import { useApi } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n/language-provider';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { FileDrop } from '@/components/ui/FileDrop';
import type { ProcessTxtBatchResult } from '@/lib/types';

interface TxtUploadModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}

export function TxtUploadModal({ open, onClose, onSaved }: TxtUploadModalProps) {
  const { apiUpload } = useApi();
  const { t } = useTranslation();

  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessTxtBatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setProcessing(false);
    setResult(null);
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleUpload = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiUpload<ProcessTxtBatchResult>(
        '/documents/bulk-txt',
        formData,
      );
      setResult(res);
      onSaved();
    } catch (err) {
      const text =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : t('documents.txt.error');
      setError(text);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal open={open} title={t('documents.txt.title')} onClose={close}>
      <div className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}

        {!result ? (
          <>
            <FileDrop
              accept=".txt,text/plain"
              label={t('documents.txt.dropLabel')}
              hint={t('documents.txt.dropHint')}
              file={file}
              onFile={setFile}
              disabled={processing}
            />
            <Button
              variant="primary"
              disabled={!file || processing}
              onClick={() => void handleUpload()}
            >
              {processing ? t('documents.txt.processing') : t('documents.uploadTxt')}
            </Button>
          </>
        ) : (
          <>
            <h3 className="font-bold">{t('documents.txt.resultTitle')}</h3>
            <Alert tone="info">{t('documents.txt.queuedNote')}</Alert>
            <div className="grid grid-cols-2 gap-3">
              <SummaryTile label={t('documents.txt.found')} value={result.totalKeysFound} />
              <SummaryTile
                label={t('documents.txt.new')}
                value={result.newKeysRegistered}
                highlight
              />
              <SummaryTile label={t('documents.txt.duplicates')} value={result.duplicatesSkipped} />
              <SummaryTile label={t('documents.txt.invalid')} value={result.invalidKeysSkipped} />
            </div>
            {result.invalidKeys.length > 0 && (
              <div className="brutal-card-sm max-h-40 overflow-y-auto bg-secondary p-3 text-xs font-mono">
                {result.invalidKeys.map((k) => (
                  <div key={k}>{k}</div>
                ))}
              </div>
            )}
            <Button variant="secondary" onClick={close}>
              {t('common.close')}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}

function SummaryTile({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={`brutal-card-sm p-3 ${highlight ? 'bg-primary' : 'bg-white'}`}>
      <p className="text-xs font-semibold uppercase text-dark/60">{label}</p>
      <p className="text-2xl font-extrabold">{value}</p>
    </div>
  );
}
