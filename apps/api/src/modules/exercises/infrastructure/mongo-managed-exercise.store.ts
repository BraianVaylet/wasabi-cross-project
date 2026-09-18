import {
  exerciseSchema,
  managedExerciseSchema,
  type Exercise,
  type ExerciseCategory,
  type ManagedExercise,
} from '@wasabi-cross/schemas';
import { MongoServerError, type ClientSession, type Db } from 'mongodb';
import { AppError } from '../../../shared/errors/app-error.ts';
import { generateId } from '../../../shared/ids.ts';
import type { NewManagedExercise } from '../domain/managed-exercise-ports.ts';
import { EXERCISES_COLLECTION, MANAGED_EXERCISES_COLLECTION } from './mongo-exercise.repository.ts';

interface ExerciseDocument extends Omit<Exercise, 'id'> {
  _id: string;
}

interface ManagedExerciseDocument extends Omit<ManagedExercise, 'id'> {
  _id: string;
}

const DUPLICATE_KEY = 11000;

/**
 * Los índices únicos son la garantía ante una carrera: dos altas del mismo ejercicio que
 * pasan juntas el chequeo previo. El segundo insert choca con el índice y se responde lo
 * mismo que habría respondido el chequeo.
 */
function rethrowDuplicate(error: unknown, meta: Record<string, unknown>): never {
  if (error instanceof MongoServerError && error.code === DUPLICATE_KEY) {
    throw new AppError('WC-EXO-409-003', { meta, cause: error });
  }
  throw error;
}

function toExercise({ _id, ...rest }: ExerciseDocument): Exercise {
  return exerciseSchema.parse({ id: _id, ...rest });
}

function toManaged({ _id, ...rest }: ManagedExerciseDocument): ManagedExercise {
  return managedExerciseSchema.parse({ id: _id, ...rest });
}

export function createMongoManagedExerciseStore(db: Db) {
  const exercises = db.collection<ExerciseDocument>(EXERCISES_COLLECTION);
  const managed = db.collection<ManagedExerciseDocument>(MANAGED_EXERCISES_COLLECTION);

  return {
    findExercise: async (id: string) => {
      const document = await exercises.findOne({ _id: id });
      return document ? toExercise(document) : null;
    },

    findExercisesByIds: async (ids: readonly string[]) =>
      (await exercises.find({ _id: { $in: [...ids] } }).toArray()).map(toExercise),

    findCatalog: async () => (await exercises.find({ ownerId: null }).toArray()).map(toExercise),

    findCustomsOf: async (userId: string) =>
      (await exercises.find({ ownerId: userId }).toArray()).map(toExercise),

    findManaged: async (userId: string, exerciseId: string) => {
      const document = await managed.findOne({ userId, exerciseId });
      return document ? toManaged(document) : null;
    },

    listManaged: async (userId: string) =>
      (await managed.find({ userId }).toArray()).map(toManaged),

    createCustom: async (
      session: ClientSession,
      exercise: { ownerId: string; name: string; category: ExerciseCategory },
    ) => {
      const now = new Date().toISOString();
      const document: ExerciseDocument = {
        _id: generateId('exo'),
        ownerId: exercise.ownerId,
        name: exercise.name,
        category: exercise.category,
        createdAt: now,
        updatedAt: now,
      };

      try {
        await exercises.insertOne(document, { session });
      } catch (error) {
        rethrowDuplicate(error, { ownerId: exercise.ownerId, name: exercise.name });
      }

      return toExercise(document);
    },

    createManaged: async (session: ClientSession, entry: NewManagedExercise) => {
      const now = new Date().toISOString();
      const document: ManagedExerciseDocument = {
        _id: generateId('mex'),
        userId: entry.userId,
        exerciseId: entry.exerciseId,
        level: entry.level,
        withPain: entry.withPain,
        createdAt: now,
        updatedAt: now,
        ...(entry.notes === undefined ? {} : { notes: entry.notes }),
      };

      try {
        await managed.insertOne(document, { session });
      } catch (error) {
        rethrowDuplicate(error, { userId: entry.userId, exerciseId: entry.exerciseId });
      }

      return toManaged(document);
    },
  };
}
