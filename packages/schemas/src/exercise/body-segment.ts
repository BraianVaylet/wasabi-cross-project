import type { BodySegment, MuscleGroup } from './exercise.schema.ts';

/*
 * De qué parte del cuerpo es cada grupo muscular (spec §5.1). El segmento no se le
 * pregunta al usuario: sale del grupo primario del ejercicio. Un dato que se puede
 * calcular no se pide, y así no hay forma de que los dos campos se contradigan.
 */

const SEGMENT: Record<MuscleGroup, BodySegment> = {
  pectoral: 'tren_superior',
  espalda: 'tren_superior',
  // La espalda baja estabiliza el tronco: cuenta como core, no como tren superior.
  espalda_baja: 'core',
  trapecio: 'tren_superior',
  hombro: 'tren_superior',
  biceps: 'tren_superior',
  triceps: 'tren_superior',
  antebrazo: 'tren_superior',
  core: 'core',
  gluteo: 'tren_inferior',
  cuadriceps: 'tren_inferior',
  isquiotibiales: 'tren_inferior',
  gemelo: 'tren_inferior',
  cuerpo_completo: 'cuerpo_completo',
};

/**
 * El segmento de un ejercicio según su grupo primario. Los secundarios no lo mueven: una
 * sentadilla con core de secundario sigue siendo tren inferior (ADR-0009). Es lo que
 * permite comparar tren inferior contra tren superior en las estadísticas generales
 * (spec §5).
 */
export function bodySegmentFor(primaryMuscleGroup: MuscleGroup): BodySegment {
  return SEGMENT[primaryMuscleGroup];
}
