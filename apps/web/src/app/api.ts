import { exerciseListSchema, type ExerciseList } from '@wasabi-cross/schemas';
import { queryOptions } from '@tanstack/react-query';
import type { HttpClient } from '../lib/http.ts';

/**
 * Lo que el front le pide a la API, tipado con los schemas compartidos. Las pantallas no
 * conocen rutas ni `fetch`: piden esto, y un test lo reemplaza por uno en memoria.
 */
export interface ApiClient {
  listExercises: () => Promise<ExerciseList>;
}

export function createApiClient(http: HttpClient): ApiClient {
  return {
    listExercises: () => http.request(exerciseListSchema, '/api/v1/exercises'),
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
