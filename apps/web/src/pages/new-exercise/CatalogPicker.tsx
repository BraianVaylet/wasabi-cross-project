import {
  disciplineSchema,
  type CatalogEntry,
  type Discipline,
  type Exercise,
} from '@wasabi-cross/schemas';
import { Card, RadioGroup, TextField } from '@wasabi-cross/ui';
import {
  CATEGORY_LABEL,
  DISCIPLINE_LABEL,
  EQUIPMENT_LABEL,
  MUSCLE_GROUP_LABEL,
  optionsFrom,
} from '../../lib/labels.ts';
import { filterCatalog } from './form.ts';

export interface CatalogPickerProps {
  catalog: readonly CatalogEntry[];
  query: string;
  onQueryChange: (query: string) => void;
  /** `null` es todas las disciplinas. */
  discipline: Discipline | null;
  onDisciplineChange: (discipline: Discipline | null) => void;
  onPick: (exercise: CatalogEntry) => void;
}

const TODAS = 'todas';
const DISCIPLINE_OPTIONS = [{ value: TODAS, label: 'Todas' }, ...optionsFrom(DISCIPLINE_LABEL)];

/** Categoría, grupo primario y equipo: lo que hace falta para reconocer el ejercicio. */
function details(exercise: Exercise): string {
  return [
    CATEGORY_LABEL[exercise.category],
    MUSCLE_GROUP_LABEL[exercise.primaryMuscleGroup],
    exercise.equipment === undefined ? null : EQUIPMENT_LABEL[exercise.equipment],
  ]
    .filter((part) => part !== null)
    .join(' · ');
}

/**
 * La pestaña "Catálogo" de Nuevo ejercicio: los precargados para elegir de una lista, sin
 * tener que saber cómo se llaman. Se busca por nombre y se filtra por disciplina. Elegir uno
 * lleva al formulario con toda su definición cargada; los que el usuario ya tiene se ven, pero
 * no se pueden volver a elegir.
 */
export function CatalogPicker({
  catalog,
  query,
  onQueryChange,
  discipline,
  onDisciplineChange,
  onPick,
}: CatalogPickerProps): React.JSX.Element {
  const results = filterCatalog(catalog, query, discipline);

  return (
    <div className="catalog-picker">
      <TextField
        label="Buscar en el catálogo"
        type="search"
        autoComplete="off"
        placeholder="Ej: sentadilla, remo…"
        value={query}
        onChange={(event) => {
          onQueryChange(event.target.value);
        }}
      />

      <RadioGroup
        legend="Disciplina"
        name="discipline"
        options={DISCIPLINE_OPTIONS}
        value={discipline ?? TODAS}
        onChange={(value) => {
          const parsed = disciplineSchema.safeParse(value);
          onDisciplineChange(parsed.success ? parsed.data : null);
        }}
      />

      {results.length === 0 ? (
        <p className="catalog-picker__empty" role="status">
          {catalog.length === 0
            ? 'Todavía no hay ejercicios en el catálogo.'
            : 'Ningún ejercicio del catálogo coincide con tu búsqueda. Podés crearlo desde la pestaña "Crear".'}
        </p>
      ) : (
        <ul className="catalog-picker__list">
          {results.map((exercise) => (
            <li key={exercise.id}>
              {exercise.alreadyAdded ? (
                <Card className="catalog-picker__item catalog-picker__item--owned">
                  <span className="catalog-picker__name">{exercise.name}</span>
                  <span className="catalog-picker__details">{details(exercise)}</span>
                  <span className="catalog-picker__owned">Ya lo tenés en tu lista</span>
                </Card>
              ) : (
                <Card
                  className="catalog-picker__item"
                  onClick={() => {
                    onPick(exercise);
                  }}
                >
                  <span className="catalog-picker__name">{exercise.name}</span>
                  <span className="catalog-picker__details">{details(exercise)}</span>
                </Card>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
