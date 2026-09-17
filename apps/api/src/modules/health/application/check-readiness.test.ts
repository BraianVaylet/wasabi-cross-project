import { describe, expect, it } from 'vitest';
import { checkReadiness } from './check-readiness.ts';

const probe = (name: string, ok: boolean) => ({ name, check: () => Promise.resolve(ok) });

describe('checkReadiness', () => {
  it('sin dependencias, está lista', async () => {
    await expect(checkReadiness([])).resolves.toEqual({ ready: true, checks: [] });
  });

  it('con todas las dependencias arriba, está lista', async () => {
    const report = await checkReadiness([probe('mongo', true), probe('otra', true)]);

    expect(report.ready).toBe(true);
    expect(report.checks).toEqual([
      { name: 'mongo', ok: true },
      { name: 'otra', ok: true },
    ]);
  });

  it('una sola dependencia caída alcanza para no estar lista', async () => {
    const report = await checkReadiness([probe('mongo', false), probe('otra', true)]);

    expect(report.ready).toBe(false);
    expect(report.checks).toEqual([
      { name: 'mongo', ok: false },
      { name: 'otra', ok: true },
    ]);
  });

  it('informa cada dependencia por nombre, no sólo el resultado global', async () => {
    const report = await checkReadiness([probe('mongo', false)]);

    expect(report.checks.map((check) => check.name)).toEqual(['mongo']);
  });
});
