import { describe, expect, it } from 'vitest';
import { planSchema } from './plan.ts';

describe('planes', () => {
  it('sólo existen free y max', () => {
    expect(planSchema.options).toEqual(['free', 'max']);
    expect(planSchema.safeParse('premium').success).toBe(false);
  });
});
