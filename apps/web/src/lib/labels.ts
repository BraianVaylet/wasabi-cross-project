import type { Capacity, Discipline, Equipment, MuscleGroup } from '@wasabi-cross/schemas';

/*
 * Cómo se llaman en pantalla las capacidades, los grupos musculares, las disciplinas y el
 * equipo. Están acá y no en cada pantalla porque los usan el alta de un ejercicio (F2-03,
 * F5-10) y las estadísticas generales (F2-08): lugares que tienen que decirles igual.
 */

export const CAPACITY_LABEL: Record<Capacity, string> = {
  fuerza: 'Fuerza',
  potencia: 'Potencia',
  resistencia: 'Resistencia',
  velocidad: 'Velocidad',
};

export const MUSCLE_GROUP_LABEL: Record<MuscleGroup, string> = {
  pectoral: 'Pectoral',
  espalda: 'Espalda',
  espalda_baja: 'Espalda baja',
  trapecio: 'Trapecio',
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

export const DISCIPLINE_LABEL: Record<Discipline, string> = {
  gimnasio: 'Gimnasio',
  crossfit: 'CrossFit',
  hyrox: 'Hyrox',
  funcional: 'Funcional',
  running: 'Running',
};

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barra: 'Barra',
  barra_dominadas: 'Barra de dominadas',
  barra_dominadas_o_anillas: 'Barra o anillas',
  mancuerna: 'Mancuerna',
  kettlebell: 'Kettlebell',
  polea: 'Polea',
  maquina: 'Máquina',
  balon_medicinal: 'Balón medicinal',
  caja: 'Cajón',
  cuerda: 'Soga',
  cuerda_de_saltar: 'Soga de saltar',
  cuerda_battle: 'Battle rope',
  remoergometro: 'Remoergómetro',
  bicicleta_assault: 'Assault bike',
  skierg: 'SkiErg',
  sled: 'Trineo',
  sandbag: 'Sandbag',
  trx: 'TRX',
  banda_elastica: 'Banda elástica',
  sin_equipo: 'Sin equipo',
};

/** Las opciones de un selector, en el orden en que se muestran. */
export function optionsFrom<TValue extends string>(
  labels: Record<TValue, string>,
): { value: TValue; label: string }[] {
  return (Object.entries(labels) as [TValue, string][]).map(([value, label]) => ({ value, label }));
}
