import type { Discipline } from '@wasabi-cross/schemas';

/*
 * El texto del hero (F10-05, spec §5.7), en voseo es-AR. El titular vive en `sitio.ts`: lo comparte
 * con la imagen para compartir el enlace.
 */

interface DisciplinaNombrada {
  /** Una disciplina del catálogo (`disciplineSchema`): el tipo y un test lo comprueban. */
  id: Discipline;
  /** Cómo se la nombra en el párrafo. */
  nombre: string;
}

export const hero = {
  /** El párrafo es `${parrafo} ${disciplinas}.` */
  parrafo: 'Registrá marcas de fuerza, repeticiones, distancia y tiempos de',
  /**
   * Las que nombra el diseño. El catálogo tiene dos más, `hybrid` y `pilates` (F5-13): sumarlas o
   * dejarlas afuera lo decide el usuario al revisar esta tarea.
   */
  disciplinas: [
    { id: 'crossfit', nombre: 'CrossFit' },
    { id: 'musculacion', nombre: 'musculación' },
    { id: 'hyrox', nombre: 'Hyrox' },
    { id: 'running', nombre: 'running' },
    { id: 'funcional', nombre: 'entrenamiento funcional' },
  ] satisfies readonly DisciplinaNombrada[],
  /** Ejemplos de ejercicios, en una línea. */
  ejercicios: ['Sentadilla', 'Burpees', 'Carrera', 'Ergómetro', 'Sled'],
  /** Lo que se registra: la unidad grande y cómo se llama la medida. */
  metricas: [
    { unidad: 'KG', nombre: 'Fuerza' },
    { unidad: 'REPS', nombre: 'Repeticiones' },
    { unidad: 'MM:SS', nombre: 'Tiempo' },
  ],
  captura: {
    alt: 'Pantalla de inicio de Wasabi Cross: ejercicios de fuerza, burpees, carrera, remo ergómetro y sled con sus marcas',
    pie: 'INICIO — Burpee en repeticiones, carrera en tiempo, peso muerto en kg y ergómetro o sled en distancia: distintas marcas en una misma vista.',
  },
} as const;
