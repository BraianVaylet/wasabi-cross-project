import { parseEnv } from '../config/env.ts';
import { seedCatalog } from '../modules/exercises/application/seed-catalog.ts';
import { createMongoExerciseRepository } from '../modules/exercises/infrastructure/mongo-exercise.repository.ts';
import { pendingMigrations } from '../shared/db/migrations.ts';
import { connectMongo } from '../shared/db/mongo.ts';

/**
 * Carga el catálogo de ejercicios. Se puede correr las veces que haga falta:
 * `pnpm --filter @wasabi-cross/api seed`.
 */
async function main(): Promise<void> {
  const env = parseEnv();
  const mongo = await connectMongo(env);

  try {
    // Sin el índice único (ownerId, name), dos corridas simultáneas podrían duplicar el
    // catálogo. El seed no migra por su cuenta: avisa y deja que lo haga quien corresponde.
    const pending = await pendingMigrations(mongo.db);
    if (pending.length > 0) {
      throw new Error(
        `Hay migraciones pendientes (${pending.join(', ')}). ` +
          'Corré `pnpm --filter @wasabi-cross/api migrate up` antes del seed.',
      );
    }

    const report = await seedCatalog(createMongoExerciseRepository(mongo.db));

    console.info(
      `Catálogo: ${String(report.created.length)} creados, ` +
        `${String(report.updated.length)} actualizados, ` +
        `${String(report.unchanged.length)} sin cambios.`,
    );

    for (const name of report.created) console.info(`  + ${name}`);
    for (const name of report.updated) console.info(`  ~ ${name}`);
  } finally {
    await mongo.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
