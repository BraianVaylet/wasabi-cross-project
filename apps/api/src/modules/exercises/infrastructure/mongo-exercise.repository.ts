import { bodySegmentFor, exerciseSchema, type Exercise } from '@wasabi-cross/schemas';
import type { Collection, Db } from 'mongodb';
import { generateId } from '../../../shared/ids.ts';
import type { CatalogExercise } from '../domain/catalog.ts';
import type { ExerciseRepository } from '../domain/exercise-repository.ts';

export const EXERCISES_COLLECTION = 'exercises';
export const MANAGED_EXERCISES_COLLECTION = 'managed_exercises';

/**
 * Documento tal como vive en Mongo. `_id` es el ID de dominio con prefijo (ADR-0004),
 * no un ObjectId, y por eso el mapeo a la entidad es directo salvo el nombre del campo.
 */
interface ExerciseDocument extends Omit<Exercise, 'id'> {
  _id: string;
}

/**
 * Lo que se guarda de una entrada del catálogo. El segmento se escribe derivado del grupo
 * primario (spec §5.1): Estadísticas lo lee de la base sin recalcularlo.
 */
function catalogFields(exercise: CatalogExercise) {
  return {
    catalogKey: exercise.catalogKey,
    name: exercise.name,
    category: exercise.category,
    capacities: exercise.capacities,
    primaryMuscleGroup: exercise.primaryMuscleGroup,
    muscleGroups: exercise.muscleGroups,
    bodySegment: bodySegmentFor(exercise.primaryMuscleGroup),
    disciplines: exercise.disciplines,
    equipment: exercise.equipment,
  };
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

    findCatalogByKey: async (catalogKey: string) => {
      // Igual que con el nombre: llega como string validado, nunca como objeto de consulta.
      const document = await collection.findOne({ ownerId: null, catalogKey });

      return document ? toEntity(document) : null;
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
        ...catalogFields(exercise),
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
            ...catalogFields(exercise),
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
