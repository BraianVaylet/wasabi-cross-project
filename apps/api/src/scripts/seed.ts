import { parseEnv } from '../config/env.ts';
import { seedCatalog } from '../modules/exercises/application/seed-catalog.ts';
import {
  createMongoExerciseRepository,
  ensureExerciseIndexes,
} from '../modules/exercises/infrastructure/mongo-exercise.repository.ts';
import { connectMongo } from '../shared/db/mongo.ts';

/**
 * Carga el catálogo de ejercicios. Se puede correr las veces que haga falta:
 * `pnpm --filter @wasabi-cross/api seed`.
 */
async function main(): Promise<void> {
  const env = parseEnv();
  const mongo = await connectMongo(env);

  try {
    await ensureExerciseIndexes(mongo.db);
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
