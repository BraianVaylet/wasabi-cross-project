import { bodySegmentFor, type Exercise } from '@wasabi-cross/schemas';
import { describe, expect, it, vi } from 'vitest';
import type { CatalogExercise } from '../domain/catalog.ts';
import type { ExerciseRepository } from '../domain/exercise-repository.ts';
import { seedCatalog } from './seed-catalog.ts';

const backSquat: CatalogExercise = {
  catalogKey: 'back-squat',
  name: 'Back squat',
  category: 'fuerza',
  capacities: ['fuerza'],
  primaryMuscleGroup: 'cuadriceps',
  muscleGroups: ['cuadriceps', 'gluteo'],
  disciplines: ['musculacion'],
  equipment: 'barra',
};

function storedFrom(definition: CatalogExercise, id = 'exo_a1b2c3d4'): Exercise {
  return {
    id,
    ownerId: null,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    ...definition,
    bodySegment: bodySegmentFor(definition.primaryMuscleGroup),
  };
}

/** Repositorio en memoria: el caso de uso no necesita Mongo para probarse. */
function fakeRepository(initial: Exercise[] = []): ExerciseRepository & { rows: Exercise[] } {
  const rows = [...initial];

  return {
    rows,
    findCatalog: () => Promise.resolve(rows),
    findCatalogByKey: (catalogKey) =>
      Promise.resolve(rows.find((row) => row.catalogKey === catalogKey) ?? null),
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

  it('no considera un cambio los mismos secundarios en otro orden', async () => {
    const repository = fakeRepository([
      storedFrom({ ...backSquat, muscleGroups: ['cuadriceps', 'gluteo', 'core'] }),
    ]);

    const report = await seedCatalog(repository, [
      { ...backSquat, muscleGroups: ['cuadriceps', 'core', 'gluteo'] },
    ]);

    expect(report.unchanged).toEqual(['Back squat']);
  });

  it('detecta un cambio de categoría, que es también un cambio de medición', async () => {
    const repository = fakeRepository([storedFrom(backSquat)]);

    const report = await seedCatalog(repository, [{ ...backSquat, category: 'hipertrofia' }]);

    expect(report.updated).toEqual(['Back squat']);
  });

  it('detecta un cambio de grupo primario, y guarda el segmento que sale de él', async () => {
    const repository = fakeRepository([storedFrom(backSquat)]);

    const report = await seedCatalog(repository, [
      {
        ...backSquat,
        primaryMuscleGroup: 'cuerpo_completo',
        muscleGroups: ['cuerpo_completo', 'cuadriceps'],
      },
    ]);

    expect(report.updated).toEqual(['Back squat']);
  });

  it('un documento con el segmento de la regla vieja se actualiza', async () => {
    // Antes de F5-01 el segmento salía de todos los grupos: un documento guardado así
    // tiene que pasar al del grupo primario.
    const repository = fakeRepository([
      { ...storedFrom(backSquat), bodySegment: 'cuerpo_completo' },
    ]);

    const report = await seedCatalog(repository, [backSquat]);

    expect(report.updated).toEqual(['Back squat']);
  });

  it('detecta un cambio de disciplinas o de equipo', async () => {
    const cambios: CatalogExercise[] = [
      { ...backSquat, disciplines: ['musculacion', 'crossfit'] },
      { ...backSquat, equipment: 'maquina' },
    ];

    for (const cambio of cambios) {
      const repository = fakeRepository([storedFrom(backSquat)]);

      const report = await seedCatalog(repository, [cambio]);

      expect(report.updated).toEqual(['Back squat']);
    }
  });

  it('un renombre actualiza la entrada de la misma clave y no crea otra', async () => {
    const repository = fakeRepository([storedFrom(backSquat)]);

    const report = await seedCatalog(repository, [{ ...backSquat, name: 'Sentadilla trasera' }]);

    expect(report.updated).toEqual(['Sentadilla trasera']);
    expect(report.created).toEqual([]);
    expect(repository.rows).toHaveLength(1);
    expect(repository.rows[0]?.id).toBe('exo_a1b2c3d4');
    expect(repository.rows[0]?.name).toBe('Sentadilla trasera');
  });

  it('otra clave es otro ejercicio, aunque se llame parecido', async () => {
    const repository = fakeRepository([storedFrom(backSquat)]);

    const report = await seedCatalog(repository, [{ ...backSquat, catalogKey: 'back-squat-2' }]);

    expect(report.created).toEqual(['Back squat']);
    expect(repository.rows).toHaveLength(2);
  });

  it('un documento viejo sin capacidades cuenta como cambio y se completa', async () => {
    // Un documento de antes de que las capacidades fueran obligatorias (F2-02): el tipo ya
    // no lo admite, pero en la base puede estar, y el seed tiene que completarlo.
    const { capacities: _c, ...resto } = storedFrom(backSquat);
    const sinCapacidades = resto as Exercise;
    const repository = fakeRepository([sinCapacidades]);

    const report = await seedCatalog(repository, [backSquat]);

    expect(report.updated).toEqual(['Back squat']);
  });

  it('agrega los ejercicios nuevos sin tocar los que ya estaban', async () => {
    const repository = fakeRepository([storedFrom(backSquat)]);

    const report = await seedCatalog(repository, [
      backSquat,
      { ...backSquat, catalogKey: 'front-squat', name: 'Front squat' },
    ]);

    expect(report.created).toEqual(['Front squat']);
    expect(report.unchanged).toEqual(['Back squat']);
  });
});
