import { parseEnv } from '../config/env.ts';
import { setPlan, SetPlanError } from '../modules/subscriptions/application/set-plan.ts';
import { createMongoPlanStore } from '../modules/subscriptions/infrastructure/mongo-plan.store.ts';
import {
  describeOutcome,
  parseSetPlanArgs,
  UsageError,
} from '../modules/subscriptions/infrastructure/set-plan-cli.ts';
import { connectMongo } from '../shared/db/mongo.ts';

/**
 * Otorga un plan a mano (F3-15, ADR-0014): la forma de que el dueño pruebe las estadísticas en un
 * ambiente desplegado mientras no hay pasarela. Sin HTTP: lo corre quien ya tiene las variables
 * del ambiente.
 *
 *   railway run pnpm --filter @wasabi-cross/api plan:set:dist --email <email> --plan pro
 *   railway run pnpm --filter @wasabi-cross/api plan:set:dist --email <email> --plan pro --apply
 *
 * Sin `--apply` dice qué cambiaría y en qué base, y no escribe. En local, `plan:set` (con tsx y el
 * `.env`). Contra un ambiente desplegado, `plan:set:dist`: no lee el `.env` local, que mezclaría
 * variables de desarrollo (`OAUTH_DEV_IDP`) con las del ambiente.
 */
async function main(): Promise<void> {
  // Antes de conectar a nada: un error de tipeo no tiene por qué tocar la base.
  const args = parseSetPlanArgs(process.argv.slice(2));

  const env = parseEnv();
  const mongo = await connectMongo(env);

  try {
    const outcome = await setPlan(
      { store: createMongoPlanStore(mongo.db), now: () => new Date() },
      { ...args, source: 'manual' },
    );

    for (const line of describeOutcome(outcome, {
      database: env.MONGODB_DB_NAME,
      environment: env.NODE_ENV,
    })) {
      console.info(line);
    }
  } finally {
    await mongo.close();
  }
}

main().catch((error: unknown) => {
  // Un pedido que no se puede cumplir es un mensaje, no un stack.
  const expected = error instanceof SetPlanError || error instanceof UsageError;
  console.error(expected ? error.message : error);
  process.exit(1);
});
