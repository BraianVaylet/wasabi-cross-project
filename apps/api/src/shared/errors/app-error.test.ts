import { describe, expect, it } from 'vitest';
import { AppError, isAppError } from './app-error.ts';

describe('AppError', () => {
  it('toma status y mensaje al usuario del catálogo', () => {
    const error = new AppError('WC-AUTH-403-002');

    expect(error.statusCode).toBe(403);
    expect(error.userMessage).toBe('No tenés permisos para esta acción.');
    expect(error.message).toBe('No tenés permisos para esta acción.');
  });

  it('permite un mensaje interno distinto del mensaje al usuario', () => {
    const error = new AppError('WC-AUTH-403-002', {
      message: 'el usuario usr_789 no es dueño del recurso',
    });

    expect(error.message).toBe('el usuario usr_789 no es dueño del recurso');
    expect(error.userMessage).toBe('No tenés permisos para esta acción.');
  });

  it('congela meta para que nadie la mute después de lanzarla', () => {
    const error = new AppError('WC-RM-422-001', { meta: { value: -5 } });

    expect(error.meta).toEqual({ value: -5 });
    expect(Object.isFrozen(error.meta)).toBe(true);
  });

  it('conserva la causa original', () => {
    const cause = new Error('econnrefused');
    const error = new AppError('WC-SYS-500-001', { cause });

    expect(error.cause).toBe(cause);
  });

  it('completa las variables del mensaje al usuario', () => {
    const error = new AppError('WC-SYS-500-001', { params: { code: 'WC-SYS-500-001' } });

    expect(error.userMessage).toBe(
      'Ocurrió un error. Compartí el código WC-SYS-500-001 con soporte.',
    );
  });

  it('sin variables, un mensaje sin llaves queda igual', () => {
    expect(new AppError('WC-RM-422-001').userMessage).toBe('El valor cargado no es válido.');
  });

  it('una variable que no se pasó queda visible en vez de desaparecer', () => {
    // Mejor un "{code}" que se note en un test que un mensaje que dice "el código ." sin avisar.
    const error = new AppError('WC-SYS-500-001');

    expect(error.userMessage).toBe('Ocurrió un error. Compartí el código {code} con soporte.');
  });

  it('es reconocible con isAppError', () => {
    expect(isAppError(new AppError('WC-SYS-500-001'))).toBe(true);
    expect(isAppError(new Error('cualquiera'))).toBe(false);
    expect(isAppError(null)).toBe(false);
  });
});
