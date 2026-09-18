import { parseEnv } from '../config/env.ts';
import { migrateDown, migrateUp, pendingMigrations } from '../shared/db/migrations.ts';
import { connectMongo } from '../shared/db/mongo.ts';

/**
 * Migraciones de Mongo (ADR-0005).
 *
 *   pnpm --filter @wasabi-cross/api migrate up       aplica las pendientes
 *   pnpm --filter @wasabi-cross/api migrate down     revierte la última
 *   pnpm --filter @wasabi-cross/api migrate status   lista las pendientes
 *
 * En producción corre una sola vez por deploy, antes de levantar la API, con la versión
 * compilada: `pnpm --filter @wasabi-cross/api migrate:dist up`.
 */
const COMMANDS = ['up', 'down', 'status'] as const;
type Command = (typeof COMMANDS)[number];

function isCommand(value: string | undefined): value is Command {
  return value !== undefined && (COMMANDS as readonly string[]).includes(value);
}

async function main(): Promise<void> {
  const command = process.argv[2];

  if (!isCommand(command)) {
    throw new Error(`Uso: migrate <${COMMANDS.join(' | ')}>`);
  }

  const env = parseEnv();
  const mongo = await connectMongo(env);

  try {
    if (command === 'up') {
      const applied = await migrateUp(mongo.db, mongo.client);
      console.info(applied.length === 0 ? 'Nada para migrar.' : `Aplicadas: ${applied.join(', ')}`);
    } else if (command === 'down') {
      const reverted = await migrateDown(mongo.db, mongo.client);
      console.info(
        reverted.length === 0 ? 'Nada para revertir.' : `Revertida: ${reverted.join(', ')}`,
      );
    } else {
      const pending = await pendingMigrations(mongo.db);
      console.info(pending.length === 0 ? 'Todo migrado.' : `Pendientes: ${pending.join(', ')}`);
    }
  } finally {
    await mongo.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
