import type { Exercise } from '@wasabi-cross/schemas';
import { describe, expect, it } from 'vitest';
import { formatDate } from '../../lib/format.ts';
import { EMPTY_VALUES, kindFor, newExerciseSchemaFor, toAddExercise } from './form.ts';

const catalogo: Exercise[] = [
  {
    id: 'exo_a1b2c3d4',
    ownerId: null,
    name: 'Back squat',
    category: 'fuerza',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'exo_z9y8x7w6',
    ownerId: null,
    name: 'Carrera 1 km',
    category: 'running',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const base = { ...EMPTY_VALUES, level: 'intermedio' as const, date: '2026-06-23' };

describe('kindFor — qué mide lo que se está cargando', () => {
  it('si el nombre es uno del catálogo, lo dice el catálogo', () => {
    expect(kindFor(catalogo, 'back SQUAT', '')).toBe('rm');
    expect(kindFor(catalogo, 'Carrera 1 km', '')).toBe('time');
  });

  it('si es uno propio, lo dice la categoría elegida', () => {
    expect(kindFor(catalogo, 'Wall ball', 'gimnastico')).toBe('reps');
  });

  it('sin nombre conocido ni categoría, todavía no se sabe', () => {
    expect(kindFor(catalogo, 'Wall ball', '')).toBeNull();
  });
});

describe('newExerciseSchemaFor — lo que se valida antes de llamar a la API', () => {
  const schema = newExerciseSchemaFor(catalogo);

  it('acepta uno del catálogo con su marca', () => {
    expect(schema.safeParse({ ...base, name: 'Back squat', value: '100' }).success).toBe(true);
  });

  it('un ejercicio propio necesita categoría', () => {
    const result = schema.safeParse({ ...base, name: 'Wall ball', value: '30' });

    expect(result.error?.issues[0]).toMatchObject({
      path: ['category'],
      message: 'Elegí una categoría',
    });
  });

  it('uno del catálogo no la necesita: ya la tiene', () => {
    expect(schema.safeParse({ ...base, name: 'Back squat', value: '100' }).success).toBe(true);
  });

  it('un tiempo mal escrito se rechaza en el campo de la marca', () => {
    const result = schema.safeParse({ ...base, name: 'Carrera 1 km', value: '4:72' });

    expect(result.error?.issues[0]).toMatchObject({ path: ['value'] });
    expect(result.error?.issues[0]?.message).toMatch(/mm:ss/);
  });

  it('una marca que no es un número se rechaza', () => {
    const result = schema.safeParse({ ...base, name: 'Back squat', value: 'cien' });

    expect(result.error?.issues[0]?.path).toEqual(['value']);
  });

  it('el nombre y el nivel son obligatorios', () => {
    expect(schema.safeParse({ ...base, name: '  ', value: '100' }).success).toBe(false);
    expect(schema.safeParse({ ...base, name: 'Back squat', value: '100', level: '' }).success).toBe(
      false,
    );
  });

  it('sin nivel, el mensaje está en es-AR y no es el crudo de Zod', () => {
    const result = schema.safeParse({ ...base, name: 'Back squat', value: '100', level: '' });

    expect(result.error?.issues[0]).toMatchObject({
      path: ['level'],
      message: 'Elegí tu nivel',
    });
  });
});

describe('toAddExercise — lo que viaja a la API', () => {
  it('uno del catálogo viaja por su ID, no por su nombre', () => {
    const input = toAddExercise(catalogo, {
      ...base,
      name: 'back squat',
      value: '100',
      notes: 'Con cinturón',
      withPain: true,
    });

    expect(input).toMatchObject({
      source: 'catalog',
      exerciseId: 'exo_a1b2c3d4',
      level: 'intermedio',
      withPain: true,
      notes: 'Con cinturón',
      firstRecord: { value: 100 },
    });
  });

  it('uno propio viaja con su nombre y su categoría', () => {
    const input = toAddExercise(catalogo, {
      ...base,
      name: 'Wall ball',
      category: 'gimnastico',
      value: '30',
    });

    expect(input).toMatchObject({
      source: 'custom',
      name: 'Wall ball',
      category: 'gimnastico',
      firstRecord: { value: 30 },
    });
  });

  it('un tiempo se guarda en segundos', () => {
    const input = toAddExercise(catalogo, { ...base, name: 'Carrera 1 km', value: '4:32' });

    expect(input.firstRecord.value).toBe(272);
  });

  it('la fecha elegida viaja al mediodía, para que no se corra de día por la zona horaria', () => {
    const input = toAddExercise(catalogo, { ...base, name: 'Back squat', value: '100' });

    // Mirado desde la zona del usuario, sigue siendo el mismo día en cualquier huso.
    expect(formatDate(input.firstRecord.performedAt ?? '')).toBe('23/06/2026');
  });

  it('sin fecha, no manda ninguna: la pone la API', () => {
    const input = toAddExercise(catalogo, { ...base, name: 'Back squat', value: '100', date: '' });

    expect(input.firstRecord.performedAt).toBeUndefined();
  });

  it('sin comentarios, no manda el campo vacío', () => {
    const input = toAddExercise(catalogo, { ...base, name: 'Back squat', value: '100' });

    expect(input.notes).toBeUndefined();
  });
});
