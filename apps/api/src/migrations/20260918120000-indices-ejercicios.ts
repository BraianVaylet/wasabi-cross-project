import type { Db } from 'mongodb';

/*
 * Índices únicos de ejercicios y ejercicios gestionados.
 *
 * Una migración no importa nada del código de la app: es una foto de cómo era la base en
 * este momento. Si mañana cambia el nombre de una colección en el código, esta migración
 * tiene que seguir haciendo lo que hizo hoy.
 */

export async function up(db: Db): Promise<void> {
  // Hace que el seed no pueda duplicar una entrada del catálogo aunque dos procesos lo
  // corran a la vez, e impide que un usuario tenga dos ejercicios propios con el mismo nombre.
  await db
    .collection('exercises')
    .createIndex({ ownerId: 1, name: 1 }, { unique: true, name: 'owner_name_unique' });

  // Un ejercicio aparece una sola vez en la lista de cada usuario (spec §5.1).
  await db
    .collection('managed_exercises')
    .createIndex({ userId: 1, exerciseId: 1 }, { unique: true, name: 'user_exercise_unique' });
}

export async function down(db: Db): Promise<void> {
  await db.collection('managed_exercises').dropIndex('user_exercise_unique');
  await db.collection('exercises').dropIndex('owner_name_unique');
}
