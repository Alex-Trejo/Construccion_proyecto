import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from './roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflectorMock: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflectorMock = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflectorMock);
  });

  it('debe permitir acceso si no hay roles requeridos', () => {
    reflectorMock.getAllAndOverride.mockReturnValue([]);
    
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('debe permitir acceso si el usuario tiene el rol', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(['Administrador']);
    
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { roles: ['Administrador', 'Contador'] },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('debe lanzar ForbiddenException si el usuario no tiene el rol', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(['Administrador']);
    
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { roles: ['Contador'] }, // No tiene Administrador
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('debe lanzar ForbiddenException si el usuario no tiene roles', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(['Administrador']);
    
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: {}, 
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
