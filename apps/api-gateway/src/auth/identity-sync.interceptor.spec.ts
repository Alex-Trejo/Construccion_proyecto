import { ExecutionContext, CallHandler } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { IdentitySyncInterceptor } from './identity-sync.interceptor';
import { IDENTITY_PATTERNS } from '@sgc/shared';

describe('IdentitySyncInterceptor', () => {
  let interceptor: IdentitySyncInterceptor;
  let msCoreClientMock: jest.Mocked<ClientProxy>;

  beforeEach(() => {
    msCoreClientMock = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<ClientProxy>;

    interceptor = new IdentitySyncInterceptor(msCoreClientMock);
  });

  it('debe emitir SYNC_USER si hay usuario autenticado', () => {
    const mockUser = {
      userId: '123',
      username: 'testuser',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      roles: ['Admin'],
    };

    const mockRequest = { user: mockUser };
    const context = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;

    const next = {
      handle: jest.fn().mockReturnValue(of('response')),
    } as CallHandler;

    msCoreClientMock.emit.mockReturnValue(of(null));

    const result = interceptor.intercept(context, next);

    expect(msCoreClientMock.emit).toHaveBeenCalledWith(
      IDENTITY_PATTERNS.SYNC_USER,
      {
        keycloakId: '123',
        username: 'testuser',
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        roles: ['Admin'],
      }
    );

    let emitted = false;
    result.subscribe(() => { emitted = true; });
    expect(emitted).toBe(true);
    expect(next.handle).toHaveBeenCalled();
  });

  it('no debe emitir si no hay usuario', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as ExecutionContext;

    const next = {
      handle: jest.fn().mockReturnValue(of('response')),
    } as CallHandler;

    interceptor.intercept(context, next);

    expect(msCoreClientMock.emit).not.toHaveBeenCalled();
    expect(next.handle).toHaveBeenCalled();
  });

  it('debe manejar errores de emision sin afectar la peticion', () => {
    const mockUser = { userId: '123', username: 'testuser' };
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: mockUser }) }),
    } as ExecutionContext;
    const next = { handle: jest.fn().mockReturnValue(of('response')) } as CallHandler;

    msCoreClientMock.emit.mockReturnValue(throwError(() => new Error('Kafka down')));

    const result = interceptor.intercept(context, next);

    let emitted = false;
    result.subscribe(() => { emitted = true; });
    expect(emitted).toBe(true);
    expect(next.handle).toHaveBeenCalled();
  });
});
