import { describe, expect, it, vi } from 'vitest';
import { isAppError } from '../../../shared/errors/app-error.ts';
import type { ExerciseUsage } from '../domain/exercise-entitlement.ts';
import type { ExerciseUsageCounter, UserSerializer } from '../domain/ports.ts';
import { withExerciseSlot } from './with-exercise-slot.ts';

/** Transacción de mentira: un objeto que se puede identificar en las aserciones. */
interface FakeTx {
  readonly id: string;
}

function fakes(usage: ExerciseUsage) {
  const tx: FakeTx = { id: 'tx-1' };
  const serializer: UserSerializer<FakeTx> = {
    runExclusive: vi.fn((_userId: string, work: (tx: FakeTx) => Promise<unknown>) => work(tx)),
  } as UserSerializer<FakeTx>;
  const counter: ExerciseUsageCounter<FakeTx> = {
    count: vi.fn(() => Promise.resolve(usage)),
  };

  return { tx, serializer, counter };
}

describe('withExerciseSlot', () => {
  it('con lugar en el plan, corre el trabajo y devuelve lo que devuelve', async () => {
    const { serializer, counter } = fakes({ total: 3, custom: 0 });
    const work = vi.fn(() => Promise.resolve('mex_nuevo0001'));

    const result = await withExerciseSlot(
      { serializer, counter },
      { userId: 'usr_braian0001', plan: 'free', isCustom: false },
      work,
    );

    expect(result).toBe('mex_nuevo0001');
    expect(work).toHaveBeenCalledOnce();
  });

  it('cuenta y trabaja dentro de la misma transacción, serializada por usuario', async () => {
    const { tx, serializer, counter } = fakes({ total: 3, custom: 0 });
    const work = vi.fn(() => Promise.resolve(null));

    await withExerciseSlot(
      { serializer, counter },
      { userId: 'usr_braian0001', plan: 'free', isCustom: false },
      work,
    );

    expect(serializer.runExclusive).toHaveBeenCalledWith('usr_braian0001', expect.any(Function));
    expect(counter.count).toHaveBeenCalledWith('usr_braian0001', tx);
    expect(work).toHaveBeenCalledWith(tx);
  });

  it('sin lugar, no corre el trabajo y responde WC-SUBS-403-001', async () => {
    const { serializer, counter } = fakes({ total: 10, custom: 1 });
    const work = vi.fn(() => Promise.resolve(null));

    const error: unknown = await withExerciseSlot(
      { serializer, counter },
      { userId: 'usr_braian0001', plan: 'free', isCustom: false },
      work,
    ).catch((caught: unknown) => caught);

    expect(work).not.toHaveBeenCalled();
    expect(isAppError(error) && error.errorCode).toBe('WC-SUBS-403-001');
  });

  it('el mensaje dice qué límite y de qué plan', async () => {
    const { serializer, counter } = fakes({ total: 10, custom: 1 });

    await expect(
      withExerciseSlot(
        { serializer, counter },
        { userId: 'usr_braian0001', plan: 'free', isCustom: false },
        () => Promise.resolve(null),
      ),
    ).rejects.toMatchObject({
      userMessage: 'Alcanzaste el máximo de 10 ejercicios de tu plan Free.',
    });
  });

  it('en el límite de propios, el mensaje habla de ejercicios propios', async () => {
    const { serializer, counter } = fakes({ total: 4, custom: 3 });

    await expect(
      withExerciseSlot(
        { serializer, counter },
        { userId: 'usr_braian0001', plan: 'free', isCustom: true },
        () => Promise.resolve(null),
      ),
    ).rejects.toMatchObject({
      userMessage: 'Alcanzaste el máximo de 3 ejercicios propios de tu plan Free.',
    });
  });

  it('deja en el log quién chocó con qué límite, sin datos personales', async () => {
    const { serializer, counter } = fakes({ total: 10, custom: 1 });

    await expect(
      withExerciseSlot(
        { serializer, counter },
        { userId: 'usr_braian0001', plan: 'free', isCustom: false },
        () => Promise.resolve(null),
      ),
    ).rejects.toMatchObject({
      meta: { userId: 'usr_braian0001', plan: 'free', exceeded: 'total', max: 10 },
    });
  });
});
