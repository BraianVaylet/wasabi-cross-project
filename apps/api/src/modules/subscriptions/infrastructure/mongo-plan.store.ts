import { planSchema } from '@wasabi-cross/schemas';
import type { Db } from 'mongodb';
import type { PlanChange, PlanHolder, PlanStore } from '../domain/plan-store.ts';

/**
 * La colección `user` es de Better Auth. Este store sólo toca los campos del plan (`plan`,
 * `planSource`, `planChangedAt`), y `requireSession` lo lee de ahí en cada pedido: un cambio rige
 * desde el pedido siguiente, sin cerrar sesión.
 */
const USERS_COLLECTION = 'user';

interface UserDocument {
  _id: string;
  email: string;
  plan?: string;
  planSource?: string;
  planChangedAt?: Date;
}

export function createMongoPlanStore(db: Db): PlanStore {
  const users = db.collection<UserDocument>(USERS_COLLECTION);

  return {
    async findByEmail(email): Promise<PlanHolder | null> {
      const user = await users.findOne({ email }, { projection: { email: 1, plan: 1 } });
      if (!user) return null;

      // Un documento sin `plan` (viejo, o tocado por una migración) cuenta como Free: es lo mismo
      // que hace `requireSession`, así que ver y cambiar el plan coinciden.
      return { id: user._id, email: user.email, plan: planSchema.catch('free').parse(user.plan) };
    },

    async writePlan(userId, change: PlanChange): Promise<void> {
      const result = await users.updateOne(
        { _id: userId },
        { $set: { plan: change.plan, planSource: change.source, planChangedAt: change.at } },
      );

      if (result.matchedCount !== 1) {
        throw new Error(`No se pudo cambiar el plan: el usuario ${userId} ya no existe.`);
      }
    },
  };
}
