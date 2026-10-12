import type { Env } from './config/env.ts';
import { addManagedExercise } from './modules/exercises/application/add-managed-exercise.ts';
import {
  deleteManagedExercise,
  editManagedExercise,
} from './modules/exercises/application/edit-managed-exercise.ts';
import {
  listManagedExercises,
  searchCatalog,
} from './modules/exercises/application/list-managed-exercises.ts';
import {
  findOwnedMeasure,
  listOwnedProfiles,
} from './modules/exercises/application/owned-exercise.ts';
import type { ExerciseRoutesOptions } from './modules/exercises/infrastructure/exercise.routes.ts';
import { createMongoExerciseRepository } from './modules/exercises/infrastructure/mongo-exercise.repository.ts';
import { createMongoManagedExerciseStore } from './modules/exercises/infrastructure/mongo-managed-exercise.store.ts';
import { listProviders } from './modules/oauth/application/list-providers.ts';
import { enabledProviders } from './modules/oauth/infrastructure/oauth-settings.ts';
import type { OauthRoutesOptions } from './modules/oauth/infrastructure/oauth.routes.ts';
import { logRecord, recordHistory } from './modules/records/application/records.ts';
import type { OwnedExerciseLookup } from './modules/records/domain/record-ports.ts';
import { createMongoRecordGateway } from './modules/records/infrastructure/mongo-record.gateway.ts';
import type { RecordRoutesOptions } from './modules/records/infrastructure/record.routes.ts';
import { exerciseStats } from './modules/stats/application/exercise-stats.ts';
import { generalStats } from './modules/stats/application/general-stats.ts';
import { activityFor } from './modules/stats/application/training-activity.ts';
import { breakdownFor } from './modules/stats/application/training-breakdown.ts';
import type {
  OwnedExerciseNameLookup,
  OwnedExercisesLookup,
} from './modules/stats/domain/stats-ports.ts';
import { createMongoStatsSource } from './modules/stats/infrastructure/mongo-stats.source.ts';
import type { StatsRoutesOptions } from './modules/stats/infrastructure/stats.routes.ts';
import { requireStatsAccess } from './modules/subscriptions/infrastructure/require-stats-access.ts';
import { getPhoto } from './modules/users/application/get-photo.ts';
import { getPreferences, updatePreferences } from './modules/users/application/preferences.ts';
import {
  createPhotoDownloader,
  type PhotoDownloaderOptions,
} from './modules/users/infrastructure/download-photo.ts';
import { createMongoPreferencesStore } from './modules/users/infrastructure/mongo-preferences.store.ts';
import type { PhotoRoutesOptions } from './modules/users/infrastructure/photo.routes.ts';
import type { PreferencesRoutesOptions } from './modules/users/infrastructure/preferences.routes.ts';
import type { MongoConnection } from './shared/db/mongo.ts';
import { createMongoTransactionRunner } from './shared/db/transactions.ts';

/**
 * Raíz de composición: el único lugar que conoce a todos los módulos y los conecta.
 *
 * Cada módulo define los puertos que necesita y otro los cumple, sin importarse entre
 * sí: `exercises` pide una forma de guardar marcas y `records` la da. Si un contrato no
 * coincide, TypeScript lo marca acá.
 */
export function composeExercises(
  mongo: MongoConnection,
): Omit<ExerciseRoutesOptions, 'requireSession'> {
  const repository = createMongoExerciseRepository(mongo.db);
  const store = createMongoManagedExerciseStore(mongo.db);
  const records = createMongoRecordGateway(mongo.db);
  const transactions = createMongoTransactionRunner(mongo.client);

  return {
    searchCatalog: (user, filters) => searchCatalog({ repository, store }, user.id, filters),
    addExercise: (user, input) =>
      addManagedExercise({ store, transactions, records }, { userId: user.id, input }),
    listExercises: (user) => listManagedExercises({ store, records }, user),
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
 * quién es el ejercicio y cómo se llama, y las marcas se leen como serie. Que sean de Pro
 * (spec §4) lo decide `subscriptions`, y se cablea acá.
 */
export function composeStats(mongo: MongoConnection): Omit<StatsRoutesOptions, 'requireSession'> {
  const exercises = createMongoManagedExerciseStore(mongo.db);
  const records = createMongoStatsSource(mongo.db);

  const lookup: OwnedExerciseNameLookup = {
    findOwned: (userId, managedExerciseId) =>
      findOwnedMeasure(exercises, userId, managedExerciseId),
  };

  const list: OwnedExercisesLookup = {
    listOwned: (userId) => listOwnedProfiles(exercises, userId),
  };

  return {
    requireStatsAccess: requireStatsAccess(),
    exerciseStats: (userId, managedExerciseId, period) =>
      exerciseStats({ lookup, records }, { userId, managedExerciseId, period }),
    generalStats: (userId, period) => generalStats({ lookup: list, records }, { userId, period }),
    trainingBreakdown: (userId) => breakdownFor({ lookup: list }, userId),
    trainingActivity: (userId, period) =>
      activityFor({ lookup: list, records, now: () => new Date() }, { userId, period }),
  };
}

/**
 * El ingreso por proveedores (F9-02). `oauth` sólo necesita saber qué proveedores tienen
 * credenciales: lo lee del entorno, una vez, al arrancar.
 */
export function composeOauth(env: Env): OauthRoutesOptions {
  const enabled = enabledProviders(env);

  return { listProviders: () => listProviders(enabled) };
}

/** Las preferencias (F1-08). `users` no necesita nada de otro módulo. */
/**
 * La foto del usuario (F9-08): `getPhoto` con la descarga de Google conectada. Sin opciones usa el
 * `fetch` de Node y los límites de siempre; los tests le pasan su propio `fetch` (nunca la red).
 */
export function composePhoto(
  options: PhotoDownloaderOptions = {},
): Omit<PhotoRoutesOptions, 'requireSession'> {
  const download = createPhotoDownloader(options);

  return { getPhoto: (image) => getPhoto({ download }, image) };
}

export function composeUsers(
  mongo: MongoConnection,
): Omit<PreferencesRoutesOptions, 'requireSession'> {
  const store = createMongoPreferencesStore(mongo.db);

  return {
    getPreferences: (userId) => getPreferences(store, userId),
    updatePreferences: (userId, change) => updatePreferences(store, userId, change),
  };
}
