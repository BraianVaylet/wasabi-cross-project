import {
  exerciseListSchema,
  exerciseStatsSchema,
  generalStatsSchema,
  logRecordResponseSchema,
  recordHistorySchema,
  exerciseSchema,
  managedExerciseSummarySchema,
  userPreferencesSchema,
  type AddExercise,
  type Exercise,
  type ExerciseList,
  type ExerciseStats,
  type GeneralStats,
  type LogRecordResponse,
  type ManagedExerciseSummary,
  type RecordHistory,
  type RecordInput,
  type StatsPeriod,
  type UpdateManagedExercise,
  type UpdatePreferences,
  type UserPreferences,
} from '@wasabi-cross/schemas';
import { z } from 'zod';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
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
  updateExercise: (id: string, change: UpdateManagedExercise) => Promise<ManagedExerciseSummary>;
  deleteExercise: (id: string) => Promise<void>;
  /** Una página del historial de marcas (F1-07), de la más reciente a la más vieja. */
  history: (id: string, page: { limit: number; cursor?: string }) => Promise<RecordHistory>;
  /** Carga una marca nueva (F1-14). La API decide si el valor vale para esa medición. */
  logRecord: (id: string, input: RecordInput) => Promise<LogRecordResponse>;
  /** La evolución de un ejercicio en un período (F2-04). */
  exerciseStats: (id: string, period: StatsPeriod) => Promise<ExerciseStats>;
  /** El resumen por capacidad y grupo muscular (F2-05). */
  generalStats: (period: StatsPeriod) => Promise<GeneralStats>;
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
    updateExercise: (id, change) =>
      http.request(managedExerciseSummarySchema, `/api/v1/exercises/${id}`, {
        method: 'PATCH',
        body: change,
      }),
    deleteExercise: async (id) => {
      // 204: la API no devuelve nada al borrar.
      await http.request(z.undefined(), `/api/v1/exercises/${id}`, { method: 'DELETE' });
    },
    history: (id, page) => {
      const query = new URLSearchParams({ limit: String(page.limit) });
      if (page.cursor !== undefined) {
        query.set('cursor', page.cursor);
      }
      return http.request(
        recordHistorySchema,
        `/api/v1/exercises/${id}/records?${query.toString()}`,
      );
    },
    logRecord: (id, input) =>
      http.request(logRecordResponseSchema, `/api/v1/exercises/${id}/records`, {
        method: 'POST',
        body: input,
      }),
    exerciseStats: (id, period) =>
      http.request(exerciseStatsSchema, `/api/v1/stats/exercises/${id}?period=${period}`),
    generalStats: (period) =>
      http.request(generalStatsSchema, `/api/v1/stats/summary?period=${period}`),
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

/** Cuántas marcas se ven de entrada en el detalle (mockup 6). */
export const HISTORY_PAGE_SIZE = 3;

export function historyQueryKey(id: string): readonly unknown[] {
  return ['history', id];
}

/**
 * El historial de un ejercicio, paginado por cursor: "Ver más" trae la página siguiente sin
 * repetir ninguna marca.
 */
export function historyQueryOptions(api: ApiClient, id: string) {
  return infiniteQueryOptions({
    queryKey: historyQueryKey(id),
    queryFn: ({ pageParam }) =>
      api.history(id, {
        limit: HISTORY_PAGE_SIZE,
        ...(pageParam === undefined ? {} : { cursor: pageParam }),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function exerciseStatsQueryKey(id: string, period: StatsPeriod): readonly unknown[] {
  return ['stats', id, period];
}

/**
 * La evolución de un ejercicio. Se pide recién cuando el acordeón lo abre (F2-07): en una
 * lista de diez, nueve de esas consultas no las mira nadie.
 */
export function exerciseStatsQueryOptions(api: ApiClient, id: string, period: StatsPeriod) {
  return queryOptions({
    queryKey: exerciseStatsQueryKey(id, period),
    queryFn: () => api.exerciseStats(id, period),
    staleTime: 5 * 60 * 1000,
  });
}

export function generalStatsQueryKey(period: StatsPeriod): readonly unknown[] {
  return ['stats', 'summary', period];
}

/** El resumen general de la pantalla (F2-08). Cambia sólo cuando cambia el período. */
export function generalStatsQueryOptions(api: ApiClient, period: StatsPeriod) {
  return queryOptions({
    queryKey: generalStatsQueryKey(period),
    queryFn: () => api.generalStats(period),
    staleTime: 5 * 60 * 1000,
  });
}
