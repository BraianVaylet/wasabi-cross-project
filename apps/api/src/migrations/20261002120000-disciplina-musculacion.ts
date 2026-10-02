import type { Db } from 'mongodb';

/*
 * La disciplina "gimnasio" pasa a llamarse "musculación" (spec §5.1).
 *
 * El nombre de la disciplina se guarda tal cual en `disciplines`, tanto en los ejercicios del
 * catálogo como en los propios, y el schema ya sólo acepta `musculacion`. Sin esta migración, un
 * ejercicio con `gimnasio` dejaría de pasar la validación al leerse.
 *
 * Reemplaza sólo el elemento, en el lugar donde está: las demás disciplinas del ejercicio y el
 * orden de la lista no se tocan. Se puede correr de nuevo: un ejercicio que ya dice `musculacion`
 * no matchea.
 *
 * Los dos nombres están escritos acá y no importados de `@wasabi-cross/schemas`: una migración
 * describe un momento, y no cambia porque cambie el enum del código.
 */

async function rename(db: Db, from: string, to: string): Promise<void> {
  await db
    .collection('exercises')
    .updateMany(
      { disciplines: from },
      { $set: { 'disciplines.$[old]': to } },
      { arrayFilters: [{ old: from }] },
    );
}

export async function up(db: Db): Promise<void> {
  await rename(db, 'gimnasio', 'musculacion');
}

export async function down(db: Db): Promise<void> {
  await rename(db, 'musculacion', 'gimnasio');
}
