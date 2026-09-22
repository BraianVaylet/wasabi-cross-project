import type { BodySegment, MuscleGroup } from './exercise.schema.ts';

/*
 * De qué parte del cuerpo es cada grupo muscular (spec §5.1). El segmento no se le
 * pregunta al usuario: sale de los grupos que eligió. Un dato que se puede calcular no se
 * pide, y así no hay forma de que los dos campos se contradigan.
 */

const SEGMENT: Record<MuscleGroup, BodySegment> = {
  pectoral: 'tren_superior',
  espalda: 'tren_superior',
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
 * El segmento de un ejercicio según sus grupos musculares: el de todos si coinciden, y
 * cuerpo completo si hay de más de uno. Es lo que permite comparar tren inferior contra
 * tren superior en las estadísticas generales (spec §5).
 */
export function bodySegmentFor(muscleGroups: readonly MuscleGroup[]): BodySegment {
  const segments = new Set(muscleGroups.map((group) => SEGMENT[group]));
  const only = [...segments];

  return only.length === 1 && only[0] !== undefined ? only[0] : 'cuerpo_completo';
}
