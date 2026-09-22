import type { Capacity, MuscleGroup } from '@wasabi-cross/schemas';

/*
 * Cómo se llaman en pantalla las capacidades y los grupos musculares. Están acá y no en
 * cada pantalla porque los usan el alta de un ejercicio propio (F2-03) y las estadísticas
 * generales (F2-08): dos lugares que tienen que decirles igual.
 */

export const CAPACITY_LABEL: Record<Capacity, string> = {
  fuerza: 'Fuerza',
  resistencia: 'Resistencia',
  velocidad: 'Velocidad',
};

export const MUSCLE_GROUP_LABEL: Record<MuscleGroup, string> = {
  pectoral: 'Pectoral',
  espalda: 'Espalda',
  hombro: 'Hombro',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  antebrazo: 'Antebrazo',
  core: 'Core',
  gluteo: 'Glúteo',
  cuadriceps: 'Cuádriceps',
  isquiotibiales: 'Isquiotibiales',
  gemelo: 'Gemelo',
  cuerpo_completo: 'Cuerpo completo',
};

/** Las opciones de un selector, en el orden en que se muestran. */
export function optionsFrom<TValue extends string>(
  labels: Record<TValue, string>,
): { value: TValue; label: string }[] {
  return (Object.entries(labels) as [TValue, string][]).map(([value, label]) => ({ value, label }));
}
