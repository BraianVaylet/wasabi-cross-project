import { describe, expect, it } from 'vitest';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  signInSchema,
  signUpSchema,
} from './auth.api.ts';

const valido = {
  email: 'braian@example.com',
  name: 'Braian',
  password: 'una-frase-larga-y-propia',
  confirmPassword: 'una-frase-larga-y-propia',
};

describe('signInSchema — el login del mockup 2', () => {
  it('pide email y contraseña', () => {
    expect(signInSchema.parse({ email: 'braian@example.com', password: 'x' })).toEqual({
      email: 'braian@example.com',
      password: 'x',
    });
  });

  it('normaliza el email a minúsculas: no son dos cuentas distintas', () => {
    expect(signInSchema.parse({ email: 'Braian@Example.COM', password: 'x' }).email).toBe(
      'braian@example.com',
    );
  });

  it('no exige largo mínimo de contraseña: acá se verifica, no se elige', () => {
    expect(signInSchema.safeParse({ email: 'braian@example.com', password: 'corta' }).success).toBe(
      true,
    );
    expect(signInSchema.safeParse({ email: 'braian@example.com', password: '' }).success).toBe(
      false,
    );
  });

  it('rechaza un email inválido', () => {
    expect(signInSchema.safeParse({ email: 'no-es-un-email', password: 'x' }).success).toBe(false);
  });
});

describe('signUpSchema — el registro del mockup 3', () => {
  it('acepta email, nombre visible, contraseña y confirmación', () => {
    expect(signUpSchema.parse(valido)).toMatchObject({
      email: 'braian@example.com',
      name: 'Braian',
    });
  });

  it('el mínimo de la contraseña es el mismo que exige la API', () => {
    const corta = 'a'.repeat(PASSWORD_MIN_LENGTH - 1);
    const justa = 'a'.repeat(PASSWORD_MIN_LENGTH);

    expect(
      signUpSchema.safeParse({ ...valido, password: corta, confirmPassword: corta }).error
        ?.issues[0],
    ).toMatchObject({ path: ['password'] });
    expect(
      signUpSchema.safeParse({ ...valido, password: justa, confirmPassword: justa }).success,
    ).toBe(true);
  });

  it('rechaza una contraseña más larga que el máximo', () => {
    const larga = 'a'.repeat(PASSWORD_MAX_LENGTH + 1);

    expect(
      signUpSchema.safeParse({ ...valido, password: larga, confirmPassword: larga }).success,
    ).toBe(false);
  });

  it('si las contraseñas no coinciden, el error es del campo de confirmación', () => {
    const result = signUpSchema.safeParse({ ...valido, confirmPassword: 'otra-frase-distinta' });

    expect(result.error?.issues[0]).toMatchObject({
      path: ['confirmPassword'],
      message: 'Las contraseñas no coinciden',
    });
  });

  it('el nombre visible no puede estar vacío', () => {
    expect(signUpSchema.safeParse({ ...valido, name: '   ' }).success).toBe(false);
  });
});
