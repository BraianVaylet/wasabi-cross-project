import type { Db } from 'mongodb';

/*
 * El plan Max pasa a llamarse Pro (ADR-0011, F8-02).
 *
 * El plan se guarda tal cual en el documento del usuario —la colección `user` de Better Auth,
 * campo `plan`—, y el schema sólo acepta `free` y `pro`: un `max` se leería como `free` y el
 * usuario perdería su plan en silencio. Sólo cambia el nombre; no hay precio ni vencimiento que
 * mover, porque el pago todavía no existe.
 *
 * Se puede correr de nuevo: un usuario que ya dice `pro` no matchea. Los `free` no se tocan.
 *
 * Los dos nombres están escritos acá y no importados de `@wasabi-cross/schemas`: una migración
 * describe un momento, y no cambia porque cambie el enum del código.
 */

const USERS_COLLECTION = 'user';

async function rename(db: Db, from: string, to: string): Promise<void> {
  await db.collection(USERS_COLLECTION).updateMany({ plan: from }, { $set: { plan: to } });
}

export async function up(db: Db): Promise<void> {
  await rename(db, 'max', 'pro');
}

export async function down(db: Db): Promise<void> {
  await rename(db, 'pro', 'max');
}
