import { describe, expect, it } from 'vitest';
import { assertDevelopmentOnly } from './dev-only.ts';

describe('assertDevelopmentOnly — lo que no puede correr contra datos de verdad', () => {
  it('con NODE_ENV=production se niega, y dice qué es lo que no corre', () => {
    expect(() => {
      assertDevelopmentOnly({ NODE_ENV: 'production' }, 'seed:admin');
    }).toThrow(/seed:admin es sólo para desarrollo.*NODE_ENV=production/);
  });

  it.each(['development', 'test'] as const)('con NODE_ENV=%s deja pasar', (nodeEnv) => {
    expect(() => {
      assertDevelopmentOnly({ NODE_ENV: nodeEnv }, 'seed:admin');
    }).not.toThrow();
  });
});
