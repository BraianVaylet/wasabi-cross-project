import { describe, expect, it } from 'vitest';
import { aggregateBy } from './aggregate.ts';

/*
 * La regla que responde "¿el tren inferior progresa más rápido que el superior?" (spec §5):
 * se promedian variaciones, no valores. Un 10% de un RM y un 10% de una carrera son
 * comparables; 120 kg y 272 segundos, no.
 */

describe('aggregateBy — el promedio por capacidad o grupo muscular', () => {
  it('promedia las variaciones de los ejercicios de cada grupo', () => {
    const { groups } = aggregateBy([
      { keys: ['fuerza'], changePercent: 20 },
      { keys: ['fuerza'], changePercent: 10 },
      { keys: ['resistencia'], changePercent: 5 },
    ]);

    expect(groups).toEqual([
      { key: 'fuerza', changePercent: 15, exercises: 2 },
      { key: 'resistencia', changePercent: 5, exercises: 1 },
    ]);
  });

  it('un ejercicio cuenta en todas las claves que tiene', () => {
    const { groups } = aggregateBy([{ keys: ['fuerza', 'velocidad'], changePercent: 12 }]);

    expect(groups.map((group) => group.key)).toEqual(['fuerza', 'velocidad']);
    expect(groups.every((group) => group.exercises === 1)).toBe(true);
  });

  it('ordena de la que más progresó a la que menos, que es como se lee', () => {
    const { groups } = aggregateBy([
      { keys: ['a'], changePercent: -5 },
      { keys: ['b'], changePercent: 30 },
      { keys: ['c'], changePercent: 12 },
    ]);

    expect(groups.map((group) => group.key)).toEqual(['b', 'c', 'a']);
  });

  it('lo que no tiene variación no se informa en cero: queda aparte', () => {
    const { groups, insufficient } = aggregateBy([
      { keys: ['fuerza'], changePercent: 20 },
      { keys: ['velocidad'], changePercent: null },
    ]);

    expect(groups.map((group) => group.key)).toEqual(['fuerza']);
    expect(insufficient).toEqual(['velocidad']);
  });

  it('una clave con algo medible no aparece también como insuficiente', () => {
    const { groups, insufficient } = aggregateBy([
      { keys: ['fuerza'], changePercent: null },
      { keys: ['fuerza'], changePercent: 8 },
    ]);

    expect(groups).toEqual([{ key: 'fuerza', changePercent: 8, exercises: 1 }]);
    expect(insufficient).toEqual([]);
  });

  it('redondea el promedio a un decimal', () => {
    const { groups } = aggregateBy([
      { keys: ['fuerza'], changePercent: 10 },
      { keys: ['fuerza'], changePercent: 11 },
      { keys: ['fuerza'], changePercent: 13 },
    ]);

    expect(groups[0]?.changePercent).toBe(11.3);
  });

  it('sin ejercicios no hay nada que decir', () => {
    expect(aggregateBy([])).toEqual({ groups: [], insufficient: [] });
  });
});
