/**
 * @fileoverview Admin · Usuarios (sólo Administrador).
 *
 * GET /users (IUserDto[]), POST /users (ICreateUserDto), PUT /users/:id/roles
 * (IAssignRolesDto). Los roles disponibles se cargan de GET /roles.
 * La escritura ocurre en Keycloak (espejo en Postgres). Protegido por AdminGuard.
 *
 * @module AdminUsersPage
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  IAssignRolesDto,
  ICreateUserDto,
  IRoleDto,
  IUserDto,
} from '@sgc/shared';
import { useApi } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n/language-provider';
import { AdminGuard } from '@/components/AdminOnly';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';

export default function AdminUsersPageWrapper() {
  return (
    <AdminGuard>
      <AdminUsersPage />
    </AdminGuard>
  );
}

function AdminUsersPage() {
  const { apiGet } = useApi();
  const { t } = useTranslation();

  const [users, setUsers] = useState<ReadonlyArray<IUserDto>>([]);
  const [roles, setRoles] = useState<ReadonlyArray<IRoleDto>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [rolesFor, setRolesFor] = useState<IUserDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, r] = await Promise.all([
        apiGet<IUserDto[]>('/users'),
        apiGet<IRoleDto[]>('/roles'),
      ]);
      setUsers(u);
      setRoles(r);
    } catch {
      setError(t('users.loadError'));
    } finally {
      setLoading(false);
    }
  }, [apiGet, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <span className="brutal-badge w-fit bg-primary">{t('users.badge')}</span>
          <h1 className="text-3xl font-bold">{t('users.title')}</h1>
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}>
          {t('users.new')}
        </Button>
      </header>

      {error && <Alert tone="error">{error}</Alert>}
      {feedback && <Alert tone="success">{feedback}</Alert>}

      <Table
        headers={[
          t('users.th.username'),
          t('users.th.email'),
          t('users.th.name'),
          t('users.th.roles'),
          t('users.th.enabled'),
          t('users.th.actions'),
        ]}
        loading={loading}
        isEmpty={users.length === 0}
        loadingText={t('users.loading')}
        emptyText={t('users.empty')}
      >
        {users.map((u) => (
          <tr key={u.id}>
            <td className="font-medium">{u.username}</td>
            <td>{u.email}</td>
            <td>{`${u.firstName} ${u.lastName}`.trim() || '—'}</td>
            <td>
              <div className="flex flex-wrap gap-1">
                {u.roles.length === 0 ? (
                  <span className="text-dark/40">—</span>
                ) : (
                  u.roles.map((r) => (
                    <Badge key={r} tone="neutral">
                      {r}
                    </Badge>
                  ))
                )}
              </div>
            </td>
            <td>
              <Badge tone={u.enabled ? 'success' : 'danger'}>
                {u.enabled ? t('users.enabledYes') : t('users.enabledNo')}
              </Badge>
            </td>
            <td>
              <button onClick={() => setRolesFor(u)} className="brutal-badge bg-secondary">
                {t('users.manageRoles')}
              </button>
            </td>
          </tr>
        ))}
      </Table>

      <CreateUserModal
        open={creating}
        roles={roles}
        onClose={() => setCreating(false)}
        onCreated={(username) => {
          setFeedback(t('users.created', { username }));
          void load();
        }}
      />

      <ManageRolesModal
        user={rolesFor}
        roles={roles}
        onClose={() => setRolesFor(null)}
        onSaved={() => {
          setFeedback(t('users.rolesSaved'));
          void load();
        }}
      />
    </div>
  );
}

/** Extrae un mensaje de error legible. */
function errMessage(err: unknown, fallback: string): string {
  return typeof err === 'object' && err !== null && 'message' in err
    ? String((err as { message: unknown }).message)
    : fallback;
}

function CreateUserModal({
  open,
  roles,
  onClose,
  onCreated,
}: {
  open: boolean;
  roles: ReadonlyArray<IRoleDto>;
  onClose: () => void;
  onCreated: (username: string) => void;
}) {
  const { apiPost } = useApi();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    role: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const close = () => {
    setForm({ username: '', email: '', firstName: '', lastName: '', password: '', role: '' });
    setError(null);
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const dto: ICreateUserDto = {
        username: form.username.trim(),
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        password: form.password,
        role: form.role || roles[0]?.name || '',
      };
      await apiPost<IUserDto>('/users', dto);
      onCreated(dto.username);
      close();
    } catch (err) {
      setError(errMessage(err, t('common.unexpectedError')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={t('users.createTitle')} onClose={close}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label={t('users.form.username')} required>
          <Input value={form.username} onChange={(e) => set('username', e.target.value)} required />
        </Field>
        <Field label={t('users.form.email')} required>
          <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('users.form.firstName')}>
            <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
          </Field>
          <Field label={t('users.form.lastName')}>
            <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
          </Field>
        </div>
        <Field
          label={t('users.form.password')}
          required
          hint={t('users.form.passwordHint')}
        >
          <Input
            type="password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        <Field label={t('users.form.role')} required>
          <Select value={form.role} onChange={(e) => set('role', e.target.value)} required>
            <option value="" disabled>
              —
            </option>
            {roles.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? t('common.creating') : t('users.create')}
          </Button>
          <Button type="button" variant="secondary" onClick={close} disabled={saving}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ManageRolesModal({
  user,
  roles,
  onClose,
  onSaved,
}: {
  user: IUserDto | null;
  roles: ReadonlyArray<IRoleDto>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { apiPut } = useApi();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sincroniza la selección cuando cambia el usuario objetivo.
  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected([...user.roles]);
      setError(null);
    }
  }, [user]);

  const toggle = (role: string) =>
    setSelected((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const dto: IAssignRolesDto = { roles: selected };
      await apiPut<IUserDto>(`/users/${user.id}/roles`, dto);
      onSaved();
      onClose();
    } catch (err) {
      setError(errMessage(err, t('common.unexpectedError')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={user !== null}
      title={user ? t('users.rolesTitle', { username: user.username }) : ''}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex flex-col gap-2">
          {roles.map((r) => (
            <label key={r.name} className="brutal-card-sm flex items-center gap-3 bg-white p-3">
              <input
                type="checkbox"
                checked={selected.includes(r.name)}
                onChange={() => toggle(r.name)}
                className="h-5 w-5"
              />
              <div>
                <p className="font-semibold">{r.name}</p>
                {r.description && <p className="text-xs text-dark/60">{r.description}</p>}
              </div>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => void save()} disabled={saving}>
            {saving ? t('common.saving') : t('users.saveRoles')}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
