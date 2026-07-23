import { renderHook } from '@testing-library/react';
import { useRoles, ROLES } from './roles';
import { useSession } from 'next-auth/react';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

describe('useRoles hook', () => {
  const useSessionMock = useSession as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe devolver valores por defecto si no hay sesion', () => {
    useSessionMock.mockReturnValue({ data: null });
    const { result } = renderHook(() => useRoles());

    expect(result.current.roles).toEqual([]);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isContador).toBe(false);
    expect(result.current.isAsistente).toBe(false);
    expect(result.current.canOperate).toBe(false);
    expect(result.current.hasRole('Admin')).toBe(false);
  });

  it('debe detectar administrador', () => {
    useSessionMock.mockReturnValue({
      data: { roles: [ROLES.ADMIN] },
    });
    const { result } = renderHook(() => useRoles());

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.canOperate).toBe(true);
    expect(result.current.isContador).toBe(false);
    expect(result.current.hasRole(ROLES.ADMIN)).toBe(true);
  });

  it('debe detectar contador', () => {
    useSessionMock.mockReturnValue({
      data: { roles: [ROLES.CONTADOR] },
    });
    const { result } = renderHook(() => useRoles());

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.canOperate).toBe(false);
    expect(result.current.isContador).toBe(true);
  });

  it('debe detectar asistente', () => {
    useSessionMock.mockReturnValue({
      data: { roles: [ROLES.ASISTENTE] },
    });
    const { result } = renderHook(() => useRoles());

    expect(result.current.isAsistente).toBe(true);
    expect(result.current.canOperate).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });

  it('hasAnyRole debe devolver true si el usuario tiene al menos un rol de la lista', () => {
    useSessionMock.mockReturnValue({
      data: { roles: [ROLES.CONTADOR] },
    });
    const { result } = renderHook(() => useRoles());

    expect(result.current.hasAnyRole(ROLES.ADMIN, ROLES.CONTADOR)).toBe(true);
    expect(result.current.hasAnyRole(ROLES.ADMIN, ROLES.ASISTENTE)).toBe(false);
  });
});
