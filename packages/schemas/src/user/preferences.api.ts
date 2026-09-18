import { type z } from 'zod';
import {
  DEFAULT_LOAD_PERCENTAGES,
  userPreferencesSchema,
  type UserPreferences,
} from './user.schema.ts';

/*
 * Contratos HTTP de las preferencias (F1-08): `GET` y `PATCH /api/v1/me/preferences`. La
 * respuesta es `userPreferencesSchema`, siempre completa.
 */

/**
 * Lo que tiene un usuario que nunca cambió nada: tema oscuro ("dark first", spec §11) y
 * los porcentajes de la spec §5.
 */
export const DEFAULT_PREFERENCES: Readonly<UserPreferences> = Object.freeze({
  theme: 'dark',
  loadPercentages: [...DEFAULT_LOAD_PERCENTAGES],
});

/**
 * Cambia una preferencia o las dos. Es estricto: un campo que no está acá se rechaza en vez
 * de descartarse en silencio.
 */
export const updatePreferencesSchema = userPreferencesSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'No hay nada para actualizar');

export type UpdatePreferences = z.infer<typeof updatePreferencesSchema>;
