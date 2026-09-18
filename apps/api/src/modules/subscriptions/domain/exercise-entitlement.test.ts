import { describe, expect, it } from 'vitest';
import { decideExerciseAddition } from './exercise-entitlement.ts';

describe('decideExerciseAddition — plan Free (spec §4)', () => {
  it('con 9 ejercicios en total, el 10.º entra', () => {
    expect(decideExerciseAddition('free', { total: 9, custom: 0 }, false)).toEqual({
      allowed: true,
    });
  });

  it('con 10 ejercicios en total, el 11.º no entra', () => {
    expect(decideExerciseAddition('free', { total: 10, custom: 0 }, false)).toEqual({
      allowed: false,
      exceeded: 'total',
      max: 10,
    });
  });

  it('con 2 propios, el 3.º propio entra', () => {
    expect(decideExerciseAddition('free', { total: 5, custom: 2 }, true)).toEqual({
      allowed: true,
    });
  });

  it('con 3 propios, el 4.º propio no entra aunque sobre lugar en el total', () => {
    expect(decideExerciseAddition('free', { total: 5, custom: 3 }, true)).toEqual({
      allowed: false,
      exceeded: 'custom',
      max: 3,
    });
  });

  it('con 3 propios, uno del catálogo sí entra: el límite de propios no aplica', () => {
    expect(decideExerciseAddition('free', { total: 5, custom: 3 }, false)).toEqual({
      allowed: true,
    });
  });

  it('en el límite de los dos, informa el total: es el que el usuario ve primero', () => {
    expect(decideExerciseAddition('free', { total: 10, custom: 3 }, true)).toEqual({
      allowed: false,
      exceeded: 'total',
      max: 10,
    });
  });

  it('un conteo por encima del límite (datos de antes del plan) sigue sin dejar agregar', () => {
    expect(decideExerciseAddition('free', { total: 14, custom: 5 }, false).allowed).toBe(false);
  });
});

describe('decideExerciseAddition — plan Max', () => {
  it('no tiene límite de total ni de propios', () => {
    expect(decideExerciseAddition('max', { total: 500, custom: 400 }, true)).toEqual({
      allowed: true,
    });
    expect(decideExerciseAddition('max', { total: 500, custom: 400 }, false)).toEqual({
      allowed: true,
    });
  });
});
