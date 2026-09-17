import type { Exercise } from '@wasabi-cross/schemas';
import { describe, expect, it, vi } from 'vitest';
import type { CatalogExercise } from '../domain/catalog.ts';
import type { ExerciseRepository } from '../domain/exercise-repository.ts';
import { seedCatalog } from './seed-catalog.ts';

const backSquat: CatalogExercise = {
  name: 'Back squat',
  category: 'fuerza',
  kind: 'rm',
  capacities: ['fuerza'],
  muscleGroups: ['cuadriceps', 'gluteo'],
  bodySegment: 'tren_inferior',
};

function storedFrom(definition: CatalogExercise, id = 'exo_a1b2c3d4'): Exercise {
  const { tags, notes, ...rest } = definition;

  return {
    id,
    ownerId: null,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    tags: tags ?? {},
    ...(notes === undefined ? {} : { notes }),
    ...rest,
  };
}

/** Repositorio en memoria: el caso de uso no necesita Mongo para probarse. */
function fakeRepository(initial: Exercise[] = []): ExerciseRepository & { rows: Exercise[] } {
  const rows = [...initial];

  return {
    rows,
    findCatalog: () => Promise.resolve(rows),
    findCatalogByName: (name) => Promise.resolve(rows.find((row) => row.name === name) ?? null),
    insertCatalogExercise: (exercise) => {
      const created = storedFrom(exercise, `exo_${String(rows.length).padStart(8, '0')}`);
      rows.push(created);

      return Promise.resolve(created);
    },
    updateCatalogExercise: (id, exercise) => {
      const index = rows.findIndex((row) => row.id === id);
      const updated = storedFrom(exercise, id);
      rows[index] = updated;

      return Promise.resolve(updated);
    },
  };
}

describe('seedCatalog', () => {
  it('sobre una base vacía crea todo el catálogo', async () => {
    const repository = fakeRepository();

    const report = await seedCatalog(repository, [backSquat]);

    expect(report.created).toEqual(['Back squat']);
    expect(report.updated).toEqual([]);
    expect(repository.rows).toHaveLength(1);
  });

  it('correrlo dos veces no duplica nada', async () => {
    const repository = fakeRepository();

    await seedCatalog(repository, [backSquat]);
    const segundaCorrida = await seedCatalog(repository, [backSquat]);

    expect(repository.rows).toHaveLength(1);
    expect(segundaCorrida.created).toEqual([]);
    expect(segundaCorrida.unchanged).toEqual(['Back squat']);
  });

  it('la segunda corrida no escribe: el updatedAt no se mueve en cada deploy', async () => {
    const repository = fakeRepository();
    await seedCatalog(repository, [backSquat]);

    const update = vi.spyOn(repository, 'updateCatalogExercise');
    const insert = vi.spyOn(repository, 'insertCatalogExercise');
    await seedCatalog(repository, [backSquat]);

    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('actualiza un ejercicio cuya definición cambió en el código', async () => {
    const repository = fakeRepository([storedFrom(backSquat)]);

    const report = await seedCatalog(repository, [
      { ...backSquat, muscleGroups: ['cuadriceps', 'gluteo', 'core'] },
    ]);

    expect(report.updated).toEqual(['Back squat']);
    expect(repository.rows[0]?.muscleGroups).toEqual(['cuadriceps', 'gluteo', 'core']);
  });

  it('no considera un cambio el mismo conjunto en otro orden', async () => {
    const repository = fakeRepository([storedFrom(backSquat)]);

    const report = await seedCatalog(repository, [
      { ...backSquat, muscleGroups: ['gluteo', 'cuadriceps'] },
    ]);

    expect(report.unchanged).toEqual(['Back squat']);
  });

  it('detecta un cambio de tipo de medición', async () => {
    const repository = fakeRepository([storedFrom(backSquat)]);

    const report = await seedCatalog(repository, [{ ...backSquat, kind: 'reps' }]);

    expect(report.updated).toEqual(['Back squat']);
  });

  it('agrega los ejercicios nuevos sin tocar los que ya estaban', async () => {
    const repository = fakeRepository([storedFrom(backSquat)]);

    const report = await seedCatalog(repository, [
      backSquat,
      { ...backSquat, name: 'Front squat' },
    ]);

    expect(report.created).toEqual(['Front squat']);
    expect(report.unchanged).toEqual(['Back squat']);
  });
});
