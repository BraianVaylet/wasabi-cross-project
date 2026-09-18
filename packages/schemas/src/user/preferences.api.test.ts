import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, updatePreferencesSchema } from './preferences.api.ts';

describe('DEFAULT_PREFERENCES', () => {
  it('es tema oscuro con los porcentajes de la spec §5', () => {
    expect(DEFAULT_PREFERENCES).toEqual({
      theme: 'dark',
      loadPercentages: [65, 75, 80, 85, 90, 95],
    });
  });
});

describe('updatePreferencesSchema', () => {
  it('acepta cambiar sólo el tema o sólo los porcentajes', () => {
    expect(updatePreferencesSchema.parse({ theme: 'light' })).toEqual({ theme: 'light' });
    expect(updatePreferencesSchema.parse({ loadPercentages: [70, 80] })).toEqual({
      loadPercentages: [70, 80],
    });
  });

  it('rechaza un cambio vacío', () => {
    const result = updatePreferencesSchema.safeParse({});

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('No hay nada para actualizar');
  });

  it('rechaza un campo que no es una preferencia, en vez de descartarlo', () => {
    expect(updatePreferencesSchema.safeParse({ theme: 'light', plan: 'max' }).success).toBe(false);
  });

  it('valida los porcentajes con las mismas reglas que el perfil', () => {
    const repetidos = updatePreferencesSchema.safeParse({ loadPercentages: [70, 70] });

    expect(repetidos.error?.issues[0]).toMatchObject({
      path: ['loadPercentages'],
      message: 'No puede haber porcentajes repetidos',
    });
  });
});
