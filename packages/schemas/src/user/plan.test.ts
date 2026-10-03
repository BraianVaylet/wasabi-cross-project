import { describe, expect, it } from 'vitest';
import { canViewStats, planSchema } from './plan.ts';

describe('planes', () => {
  it('sólo existen free y pro', () => {
    expect(planSchema.options).toEqual(['free', 'pro']);
    expect(planSchema.safeParse('premium').success).toBe(false);
  });

  it('max ya no es un plan: se llamaba así antes de la Fase 8', () => {
    expect(planSchema.safeParse('max').success).toBe(false);
  });

  it('sólo pro ve las estadísticas (spec §4)', () => {
    expect(canViewStats('free')).toBe(false);
    expect(canViewStats('pro')).toBe(true);
  });
});
