import type { ClientSession } from 'mongodb';
import { addManagedExercise } from './modules/exercises/application/add-managed-exercise.ts';
import {
  listManagedExercises,
  searchCatalog,
} from './modules/exercises/application/list-managed-exercises.ts';
import type { ExerciseSlots } from './modules/exercises/domain/managed-exercise-ports.ts';
import type { ExerciseRoutesOptions } from './modules/exercises/infrastructure/exercise.routes.ts';
import { createMongoExerciseRepository } from './modules/exercises/infrastructure/mongo-exercise.repository.ts';
import { createMongoManagedExerciseStore } from './modules/exercises/infrastructure/mongo-managed-exercise.store.ts';
import { createMongoExerciseUsageCounter } from './modules/exercises/infrastructure/mongo-usage-counter.ts';
import { createMongoRecordGateway } from './modules/records/infrastructure/mongo-record.gateway.ts';
import { withExerciseSlot } from './modules/subscriptions/application/with-exercise-slot.ts';
import { createMongoUserSerializer } from './modules/subscriptions/infrastructure/mongo-user-serializer.ts';
import type { MongoConnection } from './shared/db/mongo.ts';

/**
 * Raíz de composición: el único lugar que conoce a todos los módulos y los conecta.
 *
 * Cada módulo define los puertos que necesita y otro los cumple, sin importarse entre
 * sí: `exercises` pide un cupo y una forma de guardar marcas; `subscriptions` y
 * `records` los dan. Si un contrato no coincide, TypeScript lo marca acá.
 */
export function composeExercises(
  mongo: MongoConnection,
): Omit<ExerciseRoutesOptions, 'requireSession'> {
  const repository = createMongoExerciseRepository(mongo.db);
  const store = createMongoManagedExerciseStore(mongo.db);
  const records = createMongoRecordGateway(mongo.db);
  const counter = createMongoExerciseUsageCounter(mongo.db);
  const serializer = createMongoUserSerializer(mongo.client, mongo.db);

  const slots: ExerciseSlots<ClientSession> = {
    withSlot: (request, work) => withExerciseSlot({ serializer, counter }, request, work),
  };

  return {
    searchCatalog: (query) => searchCatalog(repository, query),
    addExercise: (user, input) =>
      addManagedExercise({ store, slots, records }, { userId: user.id, plan: user.plan, input }),
    listExercises: (user) => listManagedExercises({ store, records, counter }, user),
  };
}
