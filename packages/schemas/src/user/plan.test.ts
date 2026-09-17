import { describe, expect, it } from 'vitest';
import { PLAN_LIMITS, limitsFor, planSchema } from './plan.ts';

describe('planes', () => {
  it('sólo existen free y max', () => {
    expect(planSchema.options).toEqual(['free', 'max']);
    expect(planSchema.safeParse('premium').success).toBe(false);
  });

  it('free limita a 3 custom y 10 en total (spec §4)', () => {
    expect(limitsFor('free')).toEqual({ customExercises: 3, totalExercises: 10 });
  });

  it('max no tiene límites', () => {
    expect(limitsFor('max')).toEqual({ customExercises: null, totalExercises: null });
  });

  it('hay límites definidos para todos los planes', () => {
    for (const plan of planSchema.options) {
      expect(PLAN_LIMITS[plan]).toBeDefined();
    }
  });
});
