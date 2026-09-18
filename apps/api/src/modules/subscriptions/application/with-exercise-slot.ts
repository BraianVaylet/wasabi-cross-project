import type { Plan } from '@wasabi-cross/schemas';
import { AppError } from '../../../shared/errors/app-error.ts';
import { decideExerciseAddition } from '../domain/exercise-entitlement.ts';
import type { ExerciseUsageCounter, UserSerializer } from '../domain/ports.ts';

const PLAN_NAME: Record<Plan, string> = { free: 'Free', max: 'Max' };

export interface ExerciseSlotRequest {
  userId: string;
  plan: Plan;
  /** Un ejercicio propio cuenta, además, contra el límite de propios. */
  isCustom: boolean;
}

/**
 * Corre `work` —el alta de un ejercicio— sólo si el plan del usuario tiene lugar.
 *
 * El conteo y el alta ocurren en la misma transacción, serializada por usuario. Si fueran
 * dos pasos sueltos, dos altas simultáneas con 9 ejercicios contarían 9 las dos y
 * terminarían en 11. El límite se decide acá, en el backend; el front sólo lo refleja
 * (spec §4).
 */
export async function withExerciseSlot<Tx, T>(
  deps: { serializer: UserSerializer<Tx>; counter: ExerciseUsageCounter<Tx> },
  request: ExerciseSlotRequest,
  work: (tx: Tx) => Promise<T>,
): Promise<T> {
  return deps.serializer.runExclusive(request.userId, async (tx) => {
    const usage = await deps.counter.count(request.userId, tx);
    const decision = decideExerciseAddition(request.plan, usage, request.isCustom);

    if (!decision.allowed) {
      const what = decision.exceeded === 'custom' ? 'ejercicios propios' : 'ejercicios';

      throw new AppError('WC-SUBS-403-001', {
        params: { limite: `${String(decision.max)} ${what}`, plan: PLAN_NAME[request.plan] },
        meta: {
          userId: request.userId,
          plan: request.plan,
          exceeded: decision.exceeded,
          max: decision.max,
        },
      });
    }

    return work(tx);
  });
}
