import {
  exerciseListSchema,
  exerciseSchema,
  managedExerciseSummarySchema,
  userPreferencesSchema,
  type AddExercise,
  type Exercise,
  type ExerciseList,
  type ManagedExerciseSummary,
  type UpdatePreferences,
  type UserPreferences,
} from '@wasabi-cross/schemas';
import { z } from 'zod';
import { queryOptions } from '@tanstack/react-query';
import type { HttpClient } from '../lib/http.ts';

/**
 * Lo que el front le pide a la API, tipado con los schemas compartidos. Las pantallas no
 * conocen rutas ni `fetch`: piden esto, y un test lo reemplaza por uno en memoria.
 */
export interface ApiClient {
  listExercises: () => Promise<ExerciseList>;
  /** El catálogo pre-cargado, para el buscador de "Nuevo ejercicio". */
  catalog: () => Promise<Exercise[]>;
  addExercise: (input: AddExercise) => Promise<ManagedExerciseSummary>;
  preferences: () => Promise<UserPreferences>;
  savePreferences: (change: UpdatePreferences) => Promise<UserPreferences>;
}

const catalogResponse = z.object({ exercises: z.array(exerciseSchema) });

export function createApiClient(http: HttpClient): ApiClient {
  return {
    listExercises: () => http.request(exerciseListSchema, '/api/v1/exercises'),
    catalog: async () =>
      (await http.request(catalogResponse, '/api/v1/exercises/catalog')).exercises,
    addExercise: (input) =>
      http.request(managedExerciseSummarySchema, '/api/v1/exercises', {
        method: 'POST',
        body: input,
      }),
    preferences: () => http.request(userPreferencesSchema, '/api/v1/me/preferences'),
    savePreferences: (change) =>
      http.request(userPreferencesSchema, '/api/v1/me/preferences', {
        method: 'PATCH',
        body: change,
      }),
  };
}

export const EXERCISES_QUERY_KEY = ['exercises'] as const;

/**
 * La lista de Home (F1-11). No se vuelve a pedir en cada visita: cambia cuando el usuario
 * agrega, edita o borra algo, y eso invalida la consulta.
 */
export function exerciseListQueryOptions(api: ApiClient) {
  return queryOptions({
    queryKey: EXERCISES_QUERY_KEY,
    queryFn: () => api.listExercises(),
    staleTime: 5 * 60 * 1000,
  });
}

export const CATALOG_QUERY_KEY = ['catalog'] as const;

/** El catálogo cambia poco: una vez por sesión alcanza. */
export function catalogQueryOptions(api: ApiClient) {
  return queryOptions({
    queryKey: CATALOG_QUERY_KEY,
    queryFn: () => api.catalog(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export const PREFERENCES_QUERY_KEY = ['preferences'] as const;

/**
 * Las preferencias del usuario (F1-08). Cambian poco y las cambia él mismo: se piden una
 * vez y se actualizan con lo que responde el guardado.
 */
export function preferencesQueryOptions(api: ApiClient) {
  return queryOptions({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: () => api.preferences(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}
