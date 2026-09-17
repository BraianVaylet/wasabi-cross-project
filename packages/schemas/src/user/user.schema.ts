import { z } from 'zod';
import { timestampsSchema } from '../common/datetime.ts';
import { userIdSchema } from '../common/ids.ts';
import { planSchema } from './plan.ts';

export const themeSchema = z.enum(['dark', 'light']);
export type Theme = z.infer<typeof themeSchema>;

/**
 * Porcentajes de carga que el usuario ve por default en un ejercicio de fuerza.
 * El default de la spec §5 es 65/75/80/85/90/95, configurable.
 */
export const loadPercentageSchema = z
  .number()
  .int('El porcentaje tiene que ser un número entero')
  .min(1, 'El porcentaje mínimo es 1')
  .max(100, 'El porcentaje máximo es 100');

export const DEFAULT_LOAD_PERCENTAGES = [65, 75, 80, 85, 90, 95] as const;

export const loadPercentagesSchema = z
  .array(loadPercentageSchema)
  .min(1, 'Tiene que haber al menos un porcentaje')
  .max(12, 'Como máximo 12 porcentajes')
  .refine(
    (values) => new Set(values).size === values.length,
    'No puede haber porcentajes repetidos',
  );

export const userPreferencesSchema = z.object({
  theme: themeSchema,
  loadPercentages: loadPercentagesSchema,
});

export const userSchema = z
  .object({
    id: userIdSchema,
    email: z.email('Email inválido').toLowerCase(),
    name: z.string().trim().min(1, 'El nombre no puede estar vacío').max(80),
    plan: planSchema,
    preferences: userPreferencesSchema,
  })
  .extend(timestampsSchema.shape);

export type User = z.infer<typeof userSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

/** Lo que el usuario puede cambiar de su propio perfil. Ni `plan` ni `email` están acá. */
export const updateUserProfileSchema = z
  .object({
    name: userSchema.shape.name,
    preferences: userPreferencesSchema.partial(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'No hay nada para actualizar');

export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
