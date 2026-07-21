/**
 * @fileoverview Configuración IMAP del usuario.
 *
 * GET    /user/imap-config        → carga el buzón ya configurado (sin password).
 * POST   /user/imap-config        → guarda/actualiza (password cifrado AES-256-GCM).
 * DELETE /user/imap-config        → elimina la configuración.
 * PATCH  /user/imap-config/active → pausa/activa el escaneo del buzón.
 * POST   /user/imap-config/test   → prueba la conexión (login IMAP real).
 *
 * El worker ms-sync escanea automáticamente cada buzón ACTIVO configurado.
 *
 * Directriz de seguridad: la contraseña DEBE ser una "Contraseña de
 * Aplicación" (App Password) de 16 caracteres, no la contraseña principal.
 *
 * @module ImapConfigPage
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  ICreateImapConfigDto,
  IImapConfigDto,
  IImapTestResultDto,
  ISyncTriggerResult,
} from '@sgc/shared';
import { useApi } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n/language-provider';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';

type ProviderId = 'gmail' | 'outlook' | 'yahoo' | 'icloud' | 'custom';

/** Presets de servidor/puerto IMAP por proveedor conocido. */
const PROVIDERS: ReadonlyArray<{
  readonly id: ProviderId;
  readonly labelKey: string;
  readonly host: string;
  readonly port: string;
  readonly tls: boolean;
}> = [
  { id: 'gmail', labelKey: 'imap.provider.gmail', host: 'imap.gmail.com', port: '993', tls: true },
  { id: 'outlook', labelKey: 'imap.provider.outlook', host: 'outlook.office365.com', port: '993', tls: true },
  { id: 'yahoo', labelKey: 'imap.provider.yahoo', host: 'imap.mail.yahoo.com', port: '993', tls: true },
  { id: 'icloud', labelKey: 'imap.provider.icloud', host: 'imap.mail.me.com', port: '993', tls: true },
  { id: 'custom', labelKey: 'imap.provider.custom', host: '', port: '993', tls: true },
];

interface FormState {
  provider: ProviderId;
  host: string;
  port: string;
  email: string;
  password: string;
  tls: boolean;
}

const EMPTY_FORM: FormState = {
  provider: 'gmail',
  host: 'imap.gmail.com',
  port: '993',
  email: '',
  password: '',
  tls: true,
};

/** Deduce el proveedor a partir del host guardado (para preseleccionar). */
function providerFromHost(host: string): ProviderId {
  const match = PROVIDERS.find((p) => p.id !== 'custom' && p.host === host);
  return match ? match.id : 'custom';
}

export default function ImapConfigPage() {
  const { apiGet, apiPost, apiPatch, apiDelete } = useApi();
  const { t } = useTranslation();

  const [config, setConfig] = useState<IImapConfigDto | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const loadConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const data = await apiGet<IImapConfigDto | null>('/user/imap-config');
      setConfig(data);
    } catch {
      setConfig(null);
    } finally {
      setLoadingConfig(false);
    }
  }, [apiGet]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    void loadConfig();
  }, [loadConfig]);

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  /** Al elegir un proveedor conocido, autocompleta servidor/puerto/TLS. */
  const selectProvider = (id: ProviderId) => {
    const preset = PROVIDERS.find((p) => p.id === id);
    if (!preset) return;
    setForm((prev) => ({
      ...prev,
      provider: id,
      // "custom" conserva lo que el usuario haya escrito; los demás se fijan.
      host: id === 'custom' ? prev.host : preset.host,
      port: preset.port,
      tls: preset.tls,
    }));
  };

  const isCustom = form.provider === 'custom';

  /** Precarga el formulario con la config existente para editarla. */
  const startEdit = () => {
    if (!config) return;
    setForm({
      provider: providerFromHost(config.host),
      host: config.host,
      port: String(config.port),
      email: config.email,
      password: '', // Nunca se devuelve: hay que re-ingresarla.
      tls: config.tls,
    });
    setEditing(true);
    setFeedback(null);
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(EMPTY_FORM);
    setFeedback(null);
  };

  const buildDto = (): ICreateImapConfigDto => ({
    host: form.host.trim(),
    port: Number(form.port) || 993,
    email: form.email.trim(),
    password: form.password,
    tls: form.tls,
  });

  const errorText = (err: unknown, fallbackKey: string): string =>
    typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message: unknown }).message)
      : t(fallbackKey);

  const handleTest = async () => {
    if (!form.password) {
      setFeedback({ ok: false, text: t('imap.testNeedsPassword') });
      return;
    }
    setTesting(true);
    setFeedback(null);
    try {
      const result = await apiPost<IImapTestResultDto>('/user/imap-config/test', buildDto());
      setFeedback({ ok: result.ok, text: result.message });
    } catch (err) {
      setFeedback({ ok: false, text: errorText(err, 'imap.error') });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const saved = await apiPost<IImapConfigDto>('/user/imap-config', buildDto());
      setConfig(saved);
      setEditing(false);
      setForm(EMPTY_FORM);
      setFeedback({ ok: true, text: t('imap.saved', { email: saved.email }) });
    } catch (err) {
      setFeedback({ ok: false, text: errorText(err, 'imap.error') });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!config) return;
    setBusy(true);
    setFeedback(null);
    try {
      const updated = await apiPatch<IImapConfigDto | null>('/user/imap-config/active', {
        isActive: !config.isActive,
      });
      if (updated) {
        setConfig(updated);
        setFeedback({ ok: true, text: t(updated.isActive ? 'imap.resumed' : 'imap.paused') });
      }
    } catch (err) {
      setFeedback({ ok: false, text: errorText(err, 'imap.error') });
    } finally {
      setBusy(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    setFeedback(null);
    try {
      const r = await apiPost<ISyncTriggerResult>('/user/imap-config/sync', {});
      const text =
        r.eventsEmitted > 0 || r.attachments > 0
          ? t('imap.scanDone', {
              accounts: r.accounts,
              attachments: r.attachments,
              events: r.eventsEmitted,
            })
          : t('imap.scanEmpty');
      setFeedback({ ok: true, text });
    } catch (err) {
      setFeedback({ ok: false, text: errorText(err, 'imap.scanError') });
    } finally {
      setScanning(false);
    }
  };

  const handleDelete = async () => {
    if (!config) return;
    if (!window.confirm(t('imap.action.deleteConfirm'))) return;
    setBusy(true);
    setFeedback(null);
    try {
      await apiDelete('/user/imap-config');
      setConfig(null);
      setEditing(false);
      setForm(EMPTY_FORM);
      setFeedback({ ok: true, text: t('imap.deleted') });
    } catch (err) {
      setFeedback({ ok: false, text: errorText(err, 'imap.error') });
    } finally {
      setBusy(false);
    }
  };

  // El formulario se muestra si no hay config o si el usuario pulsó "Editar".
  const showForm = !config || editing;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <span className="brutal-badge w-fit bg-primary">{t('imap.badge')}</span>
        <h1 className="text-3xl font-bold">{t('imap.title')}</h1>
        <p className="max-w-xl text-dark/70">{t('imap.desc')}</p>
      </header>

      {feedback && (
        <Alert tone={feedback.ok ? 'success' : 'error'}>{feedback.text}</Alert>
      )}

      {/* ── Buzón ya configurado ─────────────────────────────────────────── */}
      {loadingConfig ? (
        <p className="text-dark/60">{t('imap.current.loading')}</p>
      ) : config ? (
        <section className="brutal-card bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-dark/60">
                {t('imap.current.title')}
              </span>
              <span className="text-lg font-bold">{config.email}</span>
              <span className="text-sm text-dark/70">
                {t('imap.current.server')}: {config.host}:{config.port} · TLS{' '}
                {config.tls ? 'ON' : 'OFF'}
              </span>
              <span
                className={`brutal-badge mt-1 w-fit ${
                  config.isActive ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'
                }`}
              >
                {config.isActive ? t('imap.current.active') : t('imap.current.paused')}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => void handleScan()}
                disabled={busy || scanning}
              >
                {scanning ? t('imap.scanning') : t('imap.scan')}
              </Button>
              <Button variant="secondary" onClick={startEdit} disabled={busy}>
                {t('imap.action.edit')}
              </Button>
              <Button variant="dark" onClick={() => void handleToggleActive()} disabled={busy}>
                {config.isActive ? t('imap.action.pause') : t('imap.action.resume')}
              </Button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={busy}
                className="brutal-badge border-2 border-black bg-[var(--color-danger)] px-3 py-2 font-semibold text-white disabled:opacity-50"
              >
                {t('imap.action.delete')}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <Alert tone="info">{t('imap.current.none')}</Alert>
      )}

      {/* ── Formulario de alta/edición ───────────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleSubmit} className="brutal-card bg-white p-8">
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold">
              {editing ? t('imap.form.editTitle') : t('imap.form.newTitle')}
            </h2>

            <Field label={t('imap.provider')} required>
              <Select
                value={form.provider}
                onChange={(e) => selectProvider(e.target.value as ProviderId)}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {t(p.labelKey)}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Field label={t('imap.host')} required hint={!isCustom ? t('imap.autofilled') : undefined}>
                  <Input
                    value={form.host}
                    onChange={(e) => set('host', e.target.value)}
                    required
                    disabled={!isCustom}
                    className={!isCustom ? 'bg-secondary' : ''}
                  />
                </Field>
              </div>
              <Field label={t('imap.port')} required>
                <Input
                  type="number"
                  value={form.port}
                  onChange={(e) => set('port', e.target.value)}
                  required
                  disabled={!isCustom}
                  className={!isCustom ? 'bg-secondary' : ''}
                />
              </Field>
            </div>

            <Field label={t('imap.email')} required>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="bot@empresa.com"
                required
              />
            </Field>

            {/* Directriz: ayuda explícita sobre App Password de 16 caracteres. */}
            <Field
              label={t('imap.password')}
              required
              hint={
                <span className="flex items-start gap-2 rounded-md border-2 border-black bg-[var(--color-warning)] p-2 text-dark">
                  <span aria-hidden>⚠️</span>
                  <span>{t('imap.passwordHelp')}</span>
                </span>
              }
            >
              <Input
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                autoComplete="off"
                placeholder="xxxx xxxx xxxx xxxx"
                required
              />
            </Field>

            <Field label={t('imap.tls')}>
              <Select
                value={form.tls ? 'true' : 'false'}
                onChange={(e) => set('tls', e.target.value === 'true')}
              >
                <option value="true">{t('imap.tlsOn')}</option>
                <option value="false">{t('imap.tlsOff')}</option>
              </Select>
            </Field>

            <p className="text-xs text-dark/60">{t('imap.securityNote')}</p>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={saving || testing}>
                {saving ? t('imap.saving') : t('imap.save')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleTest()}
                disabled={saving || testing}
              >
                {testing ? t('imap.testing') : t('imap.test')}
              </Button>
              {editing && (
                <Button type="button" variant="dark" onClick={cancelEdit} disabled={saving || testing}>
                  {t('common.cancel')}
                </Button>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
