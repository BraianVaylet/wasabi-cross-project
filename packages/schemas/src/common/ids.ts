import { z } from 'zod';

/**
 * IDs de dominio con prefijo (`usr_`, `exo_`, `rec_`). El prefijo no es decorativo:
 * hace que un ID suelto en un log o en un reporte de soporte se explique solo, y que
 * pasar un `exerciseId` donde va un `recordId` falle en validación y no en producción.
 *
 * Ver ADR-0004.
 */
const ID_BODY = '[0-9A-Za-z_-]{8,32}';

function idSchema(prefix: string, label: string) {
  return z
    .string()
    .regex(
      new RegExp(`^${prefix}_${ID_BODY}$`),
      `${label} inválido: se espera el formato ${prefix}_…`,
    );
}

export const userIdSchema = idSchema('usr', 'ID de usuario');
export const exerciseIdSchema = idSchema('exo', 'ID de ejercicio');
export const recordIdSchema = idSchema('rec', 'ID de registro');

export type UserId = z.infer<typeof userIdSchema>;
export type ExerciseId = z.infer<typeof exerciseIdSchema>;
export type RecordId = z.infer<typeof recordIdSchema>;
