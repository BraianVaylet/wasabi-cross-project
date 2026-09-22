import type { ClientSession } from 'mongodb';
import { addManagedExercise } from './modules/exercises/application/add-managed-exercise.ts';
import {
  deleteManagedExercise,
  editManagedExercise,
} from './modules/exercises/application/edit-managed-exercise.ts';
import {
  listManagedExercises,
  searchCatalog,
} from './modules/exercises/application/list-managed-exercises.ts';
import { findOwnedMeasure } from './modules/exercises/application/owned-exercise.ts';
import type { ExerciseSlots } from './modules/exercises/domain/managed-exercise-ports.ts';
import type { ExerciseRoutesOptions } from './modules/exercises/infrastructure/exercise.routes.ts';
import { createMongoExerciseRepository } from './modules/exercises/infrastructure/mongo-exercise.repository.ts';
import { createMongoManagedExerciseStore } from './modules/exercises/infrastructure/mongo-managed-exercise.store.ts';
import { createMongoExerciseUsageCounter } from './modules/exercises/infrastructure/mongo-usage-counter.ts';
import { logRecord, recordHistory } from './modules/records/application/records.ts';
import type { OwnedExerciseLookup } from './modules/records/domain/record-ports.ts';
import { createMongoRecordGateway } from './modules/records/infrastructure/mongo-record.gateway.ts';
import type { RecordRoutesOptions } from './modules/records/infrastructure/record.routes.ts';
import { exerciseStats } from './modules/stats/application/exercise-stats.ts';
import type { OwnedExerciseNameLookup } from './modules/stats/domain/stats-ports.ts';
import { createMongoStatsSource } from './modules/stats/infrastructure/mongo-stats.source.ts';
import type { StatsRoutesOptions } from './modules/stats/infrastructure/stats.routes.ts';
import { withExerciseSlot } from './modules/subscriptions/application/with-exercise-slot.ts';
import { createMongoUserSerializer } from './modules/subscriptions/infrastructure/mongo-user-serializer.ts';
import { getPreferences, updatePreferences } from './modules/users/application/preferences.ts';
import { createMongoPreferencesStore } from './modules/users/infrastructure/mongo-preferences.store.ts';
import type { PreferencesRoutesOptions } from './modules/users/infrastructure/preferences.routes.ts';
import type { MongoConnection } from './shared/db/mongo.ts';
import { createMongoTransactionRunner } from './shared/db/transactions.ts';

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
  const transactions = createMongoTransactionRunner(mongo.client);

  const slots: ExerciseSlots<ClientSession> = {
    withSlot: (request, work) => withExerciseSlot({ serializer, counter }, request, work),
  };

  return {
    searchCatalog: (query) => searchCatalog(repository, query),
    addExercise: (user, input) =>
      addManagedExercise({ store, slots, records }, { userId: user.id, plan: user.plan, input }),
    listExercises: (user) => listManagedExercises({ store, records, counter }, user),
    editExercise: (user, managedExerciseId, input) =>
      editManagedExercise(
        { store, records, transactions },
        { userId: user.id, managedExerciseId, input },
      ),
    deleteExercise: (user, managedExerciseId) =>
      deleteManagedExercise(
        { store, records, transactions },
        { userId: user.id, managedExerciseId },
      ),
  };
}

/**
 * Las marcas (F1-07). `records` necesita saber si un ejercicio gestionado es del usuario y
 * qué mide; se lo responde `exercises`, que es su dueño.
 */
export function composeRecords(
  mongo: MongoConnection,
): Omit<RecordRoutesOptions, 'requireSession'> {
  const exercises = createMongoManagedExerciseStore(mongo.db);
  const store = createMongoRecordGateway(mongo.db);

  const lookup: OwnedExerciseLookup = {
    findOwned: (userId, managedExerciseId) =>
      findOwnedMeasure(exercises, userId, managedExerciseId),
  };

  return {
    logRecord: (userId, managedExerciseId, input) =>
      logRecord({ lookup, store }, { userId, managedExerciseId, input }),
    recordHistory: (userId, managedExerciseId, page) =>
      recordHistory({ lookup, store }, { userId, managedExerciseId, ...page }),
  };
}

/**
 * Las estadísticas (F2-04). `stats` no conoce el modelo de nadie: `exercises` le dice de
 * quién es el ejercicio y cómo se llama, y las marcas se leen como serie.
 */
export function composeStats(mongo: MongoConnection): Omit<StatsRoutesOptions, 'requireSession'> {
  const exercises = createMongoManagedExerciseStore(mongo.db);
  const records = createMongoStatsSource(mongo.db);

  const lookup: OwnedExerciseNameLookup = {
    findOwned: (userId, managedExerciseId) =>
      findOwnedMeasure(exercises, userId, managedExerciseId),
  };

  return {
    exerciseStats: (userId, managedExerciseId, period) =>
      exerciseStats({ lookup, records }, { userId, managedExerciseId, period }),
  };
}

/** Las preferencias (F1-08). `users` no necesita nada de otro módulo. */
export function composeUsers(
  mongo: MongoConnection,
): Omit<PreferencesRoutesOptions, 'requireSession'> {
  const store = createMongoPreferencesStore(mongo.db);

  return {
    getPreferences: (userId) => getPreferences(store, userId),
    updatePreferences: (userId, change) => updatePreferences(store, userId, change),
  };
}
