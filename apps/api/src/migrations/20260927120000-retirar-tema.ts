import type { Db } from 'mongodb';

/*
 * Se retira el selector dark/light (ADR-0008, F4-02): `theme` sale de las preferencias.
 * Sólo hay datos de desarrollo — no hay ambientes desplegados todavía (spec §12, Fase 3
 * bloqueada en F3-07/F3-08) — pero la regla del proyecto es toda migración versionada y
 * reversible, sin excepción para el primer deploy.
 */

const PREFERENCES_COLLECTION = 'user_preferences';

export async function up(db: Db): Promise<void> {
  await db
    .collection(PREFERENCES_COLLECTION)
    .updateMany({ theme: { $exists: true } }, { $unset: { theme: '' } });
}

export async function down(db: Db): Promise<void> {
  // Repone el default anterior a ADR-0008 en todo lo que hoy no tiene tema: no se puede
  // recuperar el que cada usuario había elegido, se perdió al correr `up`.
  await db
    .collection(PREFERENCES_COLLECTION)
    .updateMany({ theme: { $exists: false } }, { $set: { theme: 'dark' } });
}
