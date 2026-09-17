import { describe, expect, it } from 'vitest';
import { exerciseIdSchema, recordIdSchema, userIdSchema } from './ids.ts';

describe('IDs de dominio', () => {
  it('acepta un ID con su prefijo', () => {
    expect(userIdSchema.parse('usr_a1b2c3d4')).toBe('usr_a1b2c3d4');
    expect(exerciseIdSchema.parse('exo_a1b2c3d4')).toBe('exo_a1b2c3d4');
    expect(recordIdSchema.parse('rec_a1b2c3d4')).toBe('rec_a1b2c3d4');
  });

  it('rechaza un ID de otra entidad: pasar un exerciseId donde va un userId falla acá', () => {
    expect(userIdSchema.safeParse('exo_a1b2c3d4').success).toBe(false);
    expect(exerciseIdSchema.safeParse('usr_a1b2c3d4').success).toBe(false);
  });

  it('rechaza un ID sin prefijo', () => {
    expect(userIdSchema.safeParse('a1b2c3d4').success).toBe(false);
  });

  it('rechaza un cuerpo demasiado corto o demasiado largo', () => {
    expect(userIdSchema.safeParse('usr_abc').success).toBe(false);
    expect(userIdSchema.safeParse(`usr_${'a'.repeat(33)}`).success).toBe(false);
  });

  it('rechaza caracteres fuera del alfabeto permitido', () => {
    expect(userIdSchema.safeParse('usr_a1b2c3d4!').success).toBe(false);
    expect(userIdSchema.safeParse('usr_a1b2 c3d4').success).toBe(false);
  });

  it('da un mensaje que nombra el formato esperado', () => {
    const result = userIdSchema.safeParse('nope');

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('usr_');
  });
});
