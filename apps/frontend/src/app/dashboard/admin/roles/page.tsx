/**
 * @fileoverview Admin · Roles (sólo Administrador).
 *
 * GET /roles (IRoleDto[]), POST /roles (ICreateRoleDto), DELETE /roles/:name.
 * Los roles son dinámicos del realm de Keycloak. Protegido por AdminGuard.
 *
 * @module AdminRolesPage
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ICreateRoleDto, IRoleDto } from '@sgc/shared';
import { useApi } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n/language-provider';
import { AdminGuard } from '@/components/AdminOnly';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';

export default function AdminRolesPageWrapper() {
  return (
    <AdminGuard>
      <AdminRolesPage />
    </AdminGuard>
  );
}

function errMessage(err: unknown, fallback: string): string {
  return typeof err === 'object' && err !== null && 'message' in err
    ? String((err as { message: unknown }).message)
    : fallback;
}

function AdminRolesPage() {
  const { apiGet, apiDelete } = useApi();
  const { t } = useTranslation();

  const [roles, setRoles] = useState<ReadonlyArray<IRoleDto>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<IRoleDto[]>('/roles');
      setRoles(data);
    } catch {
      setError(t('roles.loadError'));
    } finally {
      setLoading(false);
    }
  }, [apiGet, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const handleDelete = async (name: string) => {
    if (!window.confirm(t('roles.confirmDelete', { name }))) return;
    setDeleting(name);
    setError(null);
    try {
      await apiDelete(`/roles/${encodeURIComponent(name)}`);
      setFeedback(t('roles.deleted', { name }));
      await load();
    } catch (err) {
      setError(errMessage(err, t('common.unexpectedError')));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <span className="brutal-badge w-fit bg-primary">{t('roles.badge')}</span>
          <h1 className="text-3xl font-bold">{t('roles.title')}</h1>
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}>
          {t('roles.new')}
        </Button>
      </header>

      {error && <Alert tone="error">{error}</Alert>}
      {feedback && <Alert tone="success">{feedback}</Alert>}

      <Table
        headers={[t('roles.th.name'), t('roles.th.desc'), t('roles.th.actions')]}
        loading={loading}
        isEmpty={roles.length === 0}
        loadingText={t('roles.loading')}
        emptyText={t('roles.empty')}
      >
        {roles.map((r) => (
          <tr key={r.name}>
            <td className="font-medium">{r.name}</td>
            <td>{r.description ?? '—'}</td>
            <td>
              <button
                onClick={() => void handleDelete(r.name)}
                disabled={deleting === r.name}
                className="brutal-badge bg-[var(--color-danger)] text-white disabled:opacity-50"
              >
                {deleting === r.name ? t('common.deleting') : t('roles.delete')}
              </button>
            </td>
          </tr>
        ))}
      </Table>

      <CreateRoleModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(name) => {
          setFeedback(t('roles.created', { name }));
          void load();
        }}
      />
    </div>
  );
}

function CreateRoleModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const { apiPost } = useApi();
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setForm({ name: '', description: '' });
    setError(null);
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const dto: ICreateRoleDto = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      };
      await apiPost<IRoleDto>('/roles', dto);
      onCreated(dto.name);
      close();
    } catch (err) {
      setError(errMessage(err, t('common.unexpectedError')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={t('roles.createTitle')} onClose={close}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label={t('roles.form.name')} required>
          <Input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
        </Field>
        <Field label={t('roles.form.desc')}>
          <Input
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
        </Field>
        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? t('common.creating') : t('roles.create')}
          </Button>
          <Button type="button" variant="secondary" onClick={close} disabled={saving}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
