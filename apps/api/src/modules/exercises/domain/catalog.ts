import type { CatalogExerciseDefinition } from '@wasabi-cross/schemas';

/**
 * Definición de un ejercicio del catálogo pre-cargado. Además de nombre y categoría, lleva
 * lo que Estadísticas necesita para comparar por capacidad y grupo muscular.
 *
 * No lleva la medición: sale de la categoría (spec §5.1). Por eso la hipertrofia se mide en
 * repeticiones sin que nadie lo escriba acá.
 */
export type CatalogExercise = CatalogExerciseDefinition;

/**
 * Catálogo base (spec §5, F0-07). El usuario nuevo lo ve sin tener que cargar nada.
 *
 * El nombre es la clave natural de cada entrada: el seed compara por nombre, así que
 * renombrar un ejercicio acá crea uno nuevo en vez de actualizar el viejo. Si alguna vez
 * hay que renombrar, va con una migración.
 */
export const EXERCISE_CATALOG: readonly CatalogExercise[] = [
  // --- Fuerza: tren inferior ---
  {
    name: 'Back squat',
    category: 'fuerza',
    capacities: ['fuerza'],
    muscleGroups: ['cuadriceps', 'gluteo', 'core'],
    bodySegment: 'tren_inferior',
  },
  {
    name: 'Front squat',
    category: 'fuerza',
    capacities: ['fuerza'],
    muscleGroups: ['cuadriceps', 'core'],
    bodySegment: 'tren_inferior',
  },
  {
    name: 'Overhead squat',
    category: 'fuerza',
    capacities: ['fuerza'],
    muscleGroups: ['cuadriceps', 'hombro', 'core'],
    bodySegment: 'cuerpo_completo',
  },
  {
    name: 'Peso muerto',
    category: 'fuerza',
    capacities: ['fuerza'],
    muscleGroups: ['isquiotibiales', 'gluteo', 'espalda'],
    bodySegment: 'tren_inferior',
  },
  {
    name: 'Peso muerto rumano',
    category: 'fuerza',
    capacities: ['fuerza'],
    muscleGroups: ['isquiotibiales', 'gluteo'],
    bodySegment: 'tren_inferior',
  },
  {
    name: 'Hip thruster',
    category: 'fuerza',
    capacities: ['fuerza'],
    muscleGroups: ['gluteo', 'isquiotibiales'],
    bodySegment: 'tren_inferior',
  },
  {
    name: 'Estocada con mancuernas',
    category: 'hipertrofia',
    capacities: ['fuerza'],
    muscleGroups: ['cuadriceps', 'gluteo'],
    bodySegment: 'tren_inferior',
  },
  {
    name: 'Elevación de gemelos',
    category: 'hipertrofia',
    capacities: ['fuerza'],
    muscleGroups: ['gemelo'],
    bodySegment: 'tren_inferior',
  },

  // --- Fuerza: tren superior ---
  {
    name: 'Press de banca',
    category: 'fuerza',
    capacities: ['fuerza'],
    muscleGroups: ['pectoral', 'triceps', 'hombro'],
    bodySegment: 'tren_superior',
  },
  {
    name: 'Floor press',
    category: 'fuerza',
    capacities: ['fuerza'],
    muscleGroups: ['pectoral', 'triceps'],
    bodySegment: 'tren_superior',
  },
  {
    name: 'Press militar',
    category: 'fuerza',
    capacities: ['fuerza'],
    muscleGroups: ['hombro', 'triceps', 'core'],
    bodySegment: 'tren_superior',
  },
  {
    name: 'Push press',
    category: 'fuerza',
    capacities: ['fuerza', 'velocidad'],
    muscleGroups: ['hombro', 'cuadriceps', 'triceps'],
    bodySegment: 'cuerpo_completo',
  },
  {
    name: 'Remo con barra',
    category: 'fuerza',
    capacities: ['fuerza'],
    muscleGroups: ['espalda', 'biceps'],
    bodySegment: 'tren_superior',
  },
  {
    name: 'Butterfly',
    category: 'hipertrofia',
    capacities: ['fuerza'],
    muscleGroups: ['pectoral'],
    bodySegment: 'tren_superior',
  },
  {
    name: 'Curl de biceps',
    category: 'hipertrofia',
    capacities: ['fuerza'],
    muscleGroups: ['biceps', 'antebrazo'],
    bodySegment: 'tren_superior',
  },
  {
    name: 'Extensión de triceps',
    category: 'hipertrofia',
    capacities: ['fuerza'],
    muscleGroups: ['triceps'],
    bodySegment: 'tren_superior',
  },

  // --- Halterofilia ---
  {
    name: 'Snatch',
    category: 'fuerza',
    capacities: ['fuerza', 'velocidad'],
    muscleGroups: ['cuerpo_completo'],
    bodySegment: 'cuerpo_completo',
  },
  {
    name: 'Clean and jerk',
    category: 'fuerza',
    capacities: ['fuerza', 'velocidad'],
    muscleGroups: ['cuerpo_completo'],
    bodySegment: 'cuerpo_completo',
  },
  {
    name: 'Power clean',
    category: 'fuerza',
    capacities: ['fuerza', 'velocidad'],
    muscleGroups: ['cuerpo_completo'],
    bodySegment: 'cuerpo_completo',
  },
  {
    name: 'Thruster',
    category: 'fuerza',
    capacities: ['fuerza', 'resistencia'],
    muscleGroups: ['cuadriceps', 'hombro'],
    bodySegment: 'cuerpo_completo',
  },

  // --- Gimnástico: se miden en repeticiones ---
  {
    name: 'Dominadas estrictas',
    category: 'gimnastico',
    capacities: ['fuerza'],
    muscleGroups: ['espalda', 'biceps'],
    bodySegment: 'tren_superior',
  },
  {
    name: 'Pull-ups',
    category: 'gimnastico',
    capacities: ['fuerza', 'resistencia'],
    muscleGroups: ['espalda', 'biceps'],
    bodySegment: 'tren_superior',
  },
  {
    name: 'Fondos en paralelas',
    category: 'gimnastico',
    capacities: ['fuerza'],
    muscleGroups: ['triceps', 'pectoral'],
    bodySegment: 'tren_superior',
  },
  {
    name: 'Flexiones de brazos',
    category: 'gimnastico',
    capacities: ['fuerza', 'resistencia'],
    muscleGroups: ['pectoral', 'triceps'],
    bodySegment: 'tren_superior',
  },
  {
    name: 'Handstand push-ups',
    category: 'gimnastico',
    capacities: ['fuerza'],
    muscleGroups: ['hombro', 'triceps'],
    bodySegment: 'tren_superior',
  },
  {
    name: 'Toes to bar',
    category: 'gimnastico',
    capacities: ['fuerza', 'resistencia'],
    muscleGroups: ['core'],
    bodySegment: 'core',
  },
  {
    name: 'Burpees',
    category: 'gimnastico',
    capacities: ['resistencia'],
    muscleGroups: ['cuerpo_completo'],
    bodySegment: 'cuerpo_completo',
  },
  {
    name: 'Double unders',
    category: 'gimnastico',
    capacities: ['resistencia', 'velocidad'],
    muscleGroups: ['gemelo'],
    bodySegment: 'tren_inferior',
  },

  // --- Running y remo: se miden en tiempo ---
  {
    name: 'Sprint 100 m',
    category: 'running',
    capacities: ['velocidad'],
    muscleGroups: ['cuadriceps', 'isquiotibiales', 'gemelo'],
    bodySegment: 'tren_inferior',
  },
  {
    name: 'Carrera 400 m',
    category: 'running',
    capacities: ['velocidad', 'resistencia'],
    muscleGroups: ['cuadriceps', 'isquiotibiales'],
    bodySegment: 'tren_inferior',
  },
  {
    name: 'Carrera 1 km',
    category: 'running',
    capacities: ['resistencia'],
    muscleGroups: ['cuadriceps', 'isquiotibiales', 'gemelo'],
    bodySegment: 'tren_inferior',
  },
  {
    name: 'Carrera 5 km',
    category: 'running',
    capacities: ['resistencia'],
    muscleGroups: ['cuadriceps', 'isquiotibiales', 'gemelo'],
    bodySegment: 'tren_inferior',
  },
  {
    name: 'Row 500 m',
    category: 'running',
    capacities: ['resistencia', 'velocidad'],
    muscleGroups: ['espalda', 'cuadriceps'],
    bodySegment: 'cuerpo_completo',
  },
];
