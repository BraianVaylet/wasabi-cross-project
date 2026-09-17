import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOAD_PERCENTAGES,
  loadPercentagesSchema,
  updateUserProfileSchema,
  userSchema,
} from './user.schema.ts';

const validUser = {
  id: 'usr_a1b2c3d4',
  email: 'braian@example.com',
  name: 'Braian',
  plan: 'free',
  preferences: { theme: 'dark', loadPercentages: [...DEFAULT_LOAD_PERCENTAGES] },
  createdAt: '2026-09-17T14:03:11.412Z',
  updatedAt: '2026-09-17T14:03:11.412Z',
};

describe('userSchema', () => {
  it('acepta un usuario válido', () => {
    expect(userSchema.safeParse(validUser).success).toBe(true);
  });

  it('normaliza el email a minúsculas', () => {
    const user = userSchema.parse({ ...validUser, email: 'Braian@Example.COM' });

    expect(user.email).toBe('braian@example.com');
  });

  it('rechaza un email inválido con un mensaje del campo', () => {
    const result = userSchema.safeParse({ ...validUser, email: 'no-es-un-email' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['email']);
    expect(result.error?.issues[0]?.message).toBe('Email inválido');
  });

  it('rechaza un nombre vacío', () => {
    expect(userSchema.safeParse({ ...validUser, name: '   ' }).success).toBe(false);
  });

  it('rechaza un plan que no existe', () => {
    expect(userSchema.safeParse({ ...validUser, plan: 'premium' }).success).toBe(false);
  });

  it('rechaza un tema que no existe', () => {
    expect(
      userSchema.safeParse({
        ...validUser,
        preferences: { ...validUser.preferences, theme: 'sepia' },
      }).success,
    ).toBe(false);
  });
});

describe('loadPercentagesSchema', () => {
  it('el default de la spec §5 es válido', () => {
    expect(loadPercentagesSchema.parse([...DEFAULT_LOAD_PERCENTAGES])).toEqual([
      65, 75, 80, 85, 90, 95,
    ]);
  });

  it('rechaza porcentajes repetidos', () => {
    const result = loadPercentagesSchema.safeParse([70, 70, 80]);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('No puede haber porcentajes repetidos');
  });

  it('rechaza una lista vacía', () => {
    expect(loadPercentagesSchema.safeParse([]).success).toBe(false);
  });

  it('rechaza más de 12 porcentajes', () => {
    expect(
      loadPercentagesSchema.safeParse(Array.from({ length: 13 }, (_, i) => i + 1)).success,
    ).toBe(false);
  });

  it('rechaza fuera del rango 1-100 y decimales', () => {
    expect(loadPercentagesSchema.safeParse([0]).success).toBe(false);
    expect(loadPercentagesSchema.safeParse([101]).success).toBe(false);
    expect(loadPercentagesSchema.safeParse([72.5]).success).toBe(false);
  });
});

describe('updateUserProfileSchema', () => {
  it('acepta un cambio parcial', () => {
    expect(updateUserProfileSchema.safeParse({ name: 'Bra' }).success).toBe(true);
    expect(updateUserProfileSchema.safeParse({ preferences: { theme: 'light' } }).success).toBe(
      true,
    );
  });

  it('rechaza un update vacío', () => {
    const result = updateUserProfileSchema.safeParse({});

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('No hay nada para actualizar');
  });

  it('no deja cambiar el plan ni el email desde el perfil', () => {
    const parsed = updateUserProfileSchema.parse({
      name: 'Bra',
      plan: 'max',
      email: 'otro@example.com',
    });

    expect(parsed).not.toHaveProperty('plan');
    expect(parsed).not.toHaveProperty('email');
  });
});
