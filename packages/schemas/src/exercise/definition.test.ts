import { describe, expect, it } from 'vitest';
import { sameDefinition, sameSet } from './definition.ts';
import type { Exercise, ExerciseDefinitionInput } from './exercise.schema.ts';

const snatch: Exercise = {
  id: 'exo_a1b2c3d4',
  ownerId: null,
  catalogKey: 'snatch',
  name: 'Snatch',
  category: 'fuerza',
  capacities: ['potencia', 'fuerza'],
  primaryMuscleGroup: 'cuerpo_completo',
  muscleGroups: ['cuerpo_completo', 'hombro', 'espalda'],
  bodySegment: 'cuerpo_completo',
  disciplines: ['crossfit'],
  equipment: 'barra',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const igual: ExerciseDefinitionInput = {
  name: 'Snatch',
  category: 'fuerza',
  capacities: ['potencia', 'fuerza'],
  primaryMuscleGroup: 'cuerpo_completo',
  secondaryMuscleGroups: ['hombro', 'espalda'],
  disciplines: ['crossfit'],
  equipment: 'barra',
};

describe('sameSet', () => {
  it('no distingue el orden', () => {
    expect(sameSet(['a', 'b'], ['b', 'a'])).toBe(true);
  });

  it('un documento viejo sin la lista no es igual a nada', () => {
    expect(sameSet(undefined, [])).toBe(false);
  });

  it('distingue lo que sobra o falta', () => {
    expect(sameSet(['a'], ['a', 'b'])).toBe(false);
    expect(sameSet(['a', 'b'], ['a', 'c'])).toBe(false);
  });
});

describe('sameDefinition — cuándo un precargado quedó tal cual', () => {
  it('la definición del catálogo, sin tocar, es la misma', () => {
    expect(sameDefinition(snatch, igual)).toBe(true);
  });

  it('el nombre en otras mayúsculas o con otros acentos no es una edición', () => {
    expect(sameDefinition(snatch, { ...igual, name: 'SNATCH' })).toBe(true);
  });

  it('el orden de las listas no es una edición', () => {
    expect(
      sameDefinition(snatch, {
        ...igual,
        capacities: ['fuerza', 'potencia'],
        secondaryMuscleGroups: ['espalda', 'hombro'],
      }),
    ).toBe(true);
  });

  it.each<[string, Partial<ExerciseDefinitionInput>]>([
    ['el nombre', { name: 'Snatch colgado' }],
    ['la categoría', { category: 'hipertrofia' }],
    ['las capacidades', { capacities: ['fuerza'] }],
    ['el grupo primario', { primaryMuscleGroup: 'hombro', secondaryMuscleGroups: ['espalda'] }],
    ['los secundarios', { secondaryMuscleGroups: ['hombro'] }],
    ['las disciplinas', { disciplines: ['crossfit', 'musculacion'] }],
    ['el equipo', { equipment: 'mancuerna' }],
  ])('cambiar %s es una edición', (_campo, cambio) => {
    expect(sameDefinition(snatch, { ...igual, ...cambio })).toBe(false);
  });

  it('sacar el equipo es una edición', () => {
    const { equipment: _equipment, ...sinEquipo } = igual;

    expect(sameDefinition(snatch, sinEquipo)).toBe(false);
  });
});
