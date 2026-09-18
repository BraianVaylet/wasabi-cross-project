import { z } from 'zod';
import { timestampsSchema } from '../common/datetime.ts';
import { exerciseIdSchema, managedExerciseIdSchema, userIdSchema } from '../common/ids.ts';
import { plainText } from '../common/text.ts';

/** Nivel del usuario en un ejercicio. Los cuatro de la leyenda del mockup 12. */
export const levelSchema = z.enum(['principiante', 'intermedio', 'avanzado', 'elite']);
export type Level = z.infer<typeof levelSchema>;

/**
 * Un ejercicio en la lista de un usuario (spec §5.1). Lleva lo que es de ese usuario y no
 * del ejercicio: por eso dos usuarios que agregan "Back squat" del catálogo pueden tener
 * niveles distintos, y el "con dolor" de uno no lo ve el otro.
 *
 * Es lo que cuenta para el límite de "ejercicios gestionados" del plan (spec §4).
 */
export const managedExerciseSchema = z
  .object({
    id: managedExerciseIdSchema,
    userId: userIdSchema,
    exerciseId: exerciseIdSchema,
    level: levelSchema,
    /**
     * Etiqueta de UX, no registro clínico (spec §2). Es un sí o no, como el checkbox
     * "with pain" del mockup 9.
     */
    withPain: z.boolean(),
    notes: plainText(500).optional(),
  })
  .extend(timestampsSchema.shape);

export type ManagedExercise = z.infer<typeof managedExerciseSchema>;
