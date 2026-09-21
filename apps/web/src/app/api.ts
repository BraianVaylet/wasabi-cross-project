import {
  exerciseListSchema,
  userPreferencesSchema,
  type ExerciseList,
  type UpdatePreferences,
  type UserPreferences,
} from '@wasabi-cross/schemas';
import { queryOptions } from '@tanstack/react-query';
import type { HttpClient } from '../lib/http.ts';

/**
 * Lo que el front le pide a la API, tipado con los schemas compartidos. Las pantallas no
 * conocen rutas ni `fetch`: piden esto, y un test lo reemplaza por uno en memoria.
 */
export interface ApiClient {
  listExercises: () => Promise<ExerciseList>;
  preferences: () => Promise<UserPreferences>;
  savePreferences: (change: UpdatePreferences) => Promise<UserPreferences>;
}

export function createApiClient(http: HttpClient): ApiClient {
  return {
    listExercises: () => http.request(exerciseListSchema, '/api/v1/exercises'),
    preferences: () => http.request(userPreferencesSchema, '/api/v1/me/preferences'),
    savePreferences: (change) =>
      http.request(userPreferencesSchema, '/api/v1/me/preferences', {
        method: 'PATCH',
        body: change,
      }),
  };
}

export const EXERCISES_QUERY_KEY = ['exercises'] as const;

/** La lista de Home (F1-11). */
export function exerciseListQueryOptions(api: ApiClient) {
  return queryOptions({
    queryKey: EXERCISES_QUERY_KEY,
    queryFn: () => api.listExercises(),
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
