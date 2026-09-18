import { exerciseSchema, type Exercise } from '@wasabi-cross/schemas';
import type { Collection, Db } from 'mongodb';
import { generateId } from '../../../shared/ids.ts';
import type { CatalogExercise } from '../domain/catalog.ts';
import type { ExerciseRepository } from '../domain/exercise-repository.ts';

export const EXERCISES_COLLECTION = 'exercises';

/**
 * Documento tal como vive en Mongo. `_id` es el ID de dominio con prefijo (ADR-0004),
 * no un ObjectId, y por eso el mapeo a la entidad es directo salvo el nombre del campo.
 */
interface ExerciseDocument extends Omit<Exercise, 'id'> {
  _id: string;
}

function toEntity(document: ExerciseDocument): Exercise {
  const { _id, ...rest } = document;

  // Se valida al salir de la base y no sólo al entrar: un documento viejo o tocado a
  // mano tiene que fallar acá, no tres capas más arriba.
  return exerciseSchema.parse({ id: _id, ...rest });
}

export function createMongoExerciseRepository(db: Db): ExerciseRepository {
  const collection: Collection<ExerciseDocument> = db.collection(EXERCISES_COLLECTION);

  return {
    findCatalog: async () => {
      const documents = await collection.find({ ownerId: null }).sort({ name: 1 }).toArray();

      return documents.map(toEntity);
    },

    findCatalogByName: async (name: string) => {
      // `name` llega tipado como string y validado por Zod en el borde. Es lo que
      // evita que entre un objeto acá: Mongo lo interpretaría como operador
      // (spec §13, NoSQL injection).
      const document = await collection.findOne({ ownerId: null, name });

      return document ? toEntity(document) : null;
    },

    insertCatalogExercise: async (exercise: CatalogExercise) => {
      const now = new Date().toISOString();
      const document: ExerciseDocument = {
        _id: generateId('exo'),
        ownerId: null,
        name: exercise.name,
        category: exercise.category,
        capacities: exercise.capacities,
        muscleGroups: exercise.muscleGroups,
        bodySegment: exercise.bodySegment,
        createdAt: now,
        updatedAt: now,
      };

      await collection.insertOne(document);

      return toEntity(document);
    },

    updateCatalogExercise: async (id: string, exercise: CatalogExercise) => {
      const updated = await collection.findOneAndUpdate(
        { _id: id, ownerId: null },
        {
          $set: {
            name: exercise.name,
            category: exercise.category,
            capacities: exercise.capacities,
            muscleGroups: exercise.muscleGroups,
            bodySegment: exercise.bodySegment,
            updatedAt: new Date().toISOString(),
          },
        },
        { returnDocument: 'after' },
      );

      if (!updated) {
        throw new Error(`No existe el ejercicio de catálogo ${id}`);
      }

      return toEntity(updated);
    },
  };
}
