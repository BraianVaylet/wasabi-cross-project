import type { Plan } from '@wasabi-cross/schemas';
import { beforeEach, describe, expect, it } from 'vitest';
import type { PlanHolder, PlanStore } from '../domain/plan-store.ts';
import { setPlan, SetPlanError } from './set-plan.ts';

/*
 * F3-15 (ADR-0014): el caso de uso que escribe el plan de un usuario. Escribe el campo que decide
 * quién ve una función de pago, así que cada guarda tiene su test: spec §9, revisión humana.
 */

const NOW = new Date('2026-10-14T12:00:00.000Z');

/** Un store en memoria que anota cada escritura, para afirmar que no hubo ninguna. */
function memoryStore(users: readonly PlanHolder[]) {
  const writes: { userId: string; plan: Plan; source: string; at: Date }[] = [];
  const lookups: string[] = [];

  const store: PlanStore = {
    findByEmail: (email) => {
      lookups.push(email);
      return Promise.resolve(users.find((user) => user.email === email) ?? null);
    },
    writePlan: (userId, change) => {
      writes.push({ userId, ...change });
      return Promise.resolve();
    },
  };

  return { store, writes, lookups };
}

const braian: PlanHolder = { id: 'usr_braian', email: 'braian@example.com', plan: 'free' };

describe('setPlan', () => {
  let fixture: ReturnType<typeof memoryStore>;
  const deps = () => ({ store: fixture.store, now: () => NOW });

  beforeEach(() => {
    fixture = memoryStore([braian, { id: 'usr_pro', email: 'pro@example.com', plan: 'pro' }]);
  });

  describe('con --apply', () => {
    it('pasa a un usuario Free a Pro, anotando que fue a mano y cuándo', async () => {
      const outcome = await setPlan(deps(), {
        email: 'braian@example.com',
        plan: 'pro',
        apply: true,
        source: 'manual',
      });

      expect(outcome).toEqual({
        status: 'changed',
        email: 'braian@example.com',
        from: 'free',
        to: 'pro',
      });
      expect(fixture.writes).toEqual([
        { userId: 'usr_braian', plan: 'pro', source: 'manual', at: NOW },
      ]);
    });

    it('lo baja de Pro a Free', async () => {
      const outcome = await setPlan(deps(), {
        email: 'pro@example.com',
        plan: 'free',
        apply: true,
        source: 'manual',
      });

      expect(outcome).toMatchObject({ status: 'changed', from: 'pro', to: 'free' });
      expect(fixture.writes).toHaveLength(1);
    });

    it('si ya tiene el plan pedido no escribe: no mueve la fecha de un otorgamiento anterior', async () => {
      const outcome = await setPlan(deps(), {
        email: 'pro@example.com',
        plan: 'pro',
        apply: true,
        source: 'manual',
      });

      expect(outcome).toEqual({ status: 'unchanged', email: 'pro@example.com', plan: 'pro' });
      expect(fixture.writes).toEqual([]);
    });
  });

  describe('sin --apply (dry-run)', () => {
    it('dice qué cambiaría y no escribe nada', async () => {
      const outcome = await setPlan(deps(), {
        email: 'braian@example.com',
        plan: 'pro',
        apply: false,
        source: 'manual',
      });

      expect(outcome).toEqual({
        status: 'would-change',
        email: 'braian@example.com',
        from: 'free',
        to: 'pro',
      });
      expect(fixture.writes).toEqual([]);
    });

    it('si no habría cambio, lo dice igual que con --apply', async () => {
      const outcome = await setPlan(deps(), {
        email: 'pro@example.com',
        plan: 'pro',
        apply: false,
        source: 'manual',
      });

      expect(outcome.status).toBe('unchanged');
    });
  });

  describe('lo que se rechaza sin tocar nada', () => {
    it('un email que no existe: no crea al usuario, y dice que tiene que entrar una vez', async () => {
      const promise = setPlan(deps(), {
        email: 'nadie@example.com',
        plan: 'pro',
        apply: true,
        source: 'manual',
      });

      await expect(promise).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
      await expect(promise).rejects.toThrow(/entrar una vez/);
      expect(fixture.writes).toEqual([]);
    });

    it.each(['max', 'admin', 'PRO', '', ' pro', 'free,pro'])(
      'el plan "%s" no existe: ni siquiera busca al usuario',
      async (plan) => {
        const promise = setPlan(deps(), {
          email: 'braian@example.com',
          plan,
          apply: true,
          source: 'manual',
        });

        await expect(promise).rejects.toBeInstanceOf(SetPlanError);
        await expect(promise).rejects.toMatchObject({ code: 'INVALID_PLAN' });
        expect(fixture.lookups).toEqual([]);
        expect(fixture.writes).toEqual([]);
      },
    );

    it.each(['', 'braian', 'braian@', '@example.com', 'a b@example.com'])(
      'el email "%s" no es un email',
      async (email) => {
        const promise = setPlan(deps(), { email, plan: 'pro', apply: true, source: 'manual' });

        await expect(promise).rejects.toMatchObject({ code: 'INVALID_EMAIL' });
        expect(fixture.lookups).toEqual([]);
        expect(fixture.writes).toEqual([]);
      },
    );
  });

  it('el email se normaliza: mayúsculas y espacios no cambian a quién se le da el plan', async () => {
    const outcome = await setPlan(deps(), {
      email: '  Braian@Example.COM ',
      plan: 'pro',
      apply: true,
      source: 'manual',
    });

    expect(outcome).toMatchObject({ status: 'changed', email: 'braian@example.com' });
    expect(fixture.lookups).toEqual(['braian@example.com']);
    expect(fixture.writes[0]?.userId).toBe('usr_braian');
  });
});
