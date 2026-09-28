import { nameMatches, type Exercise } from '@wasabi-cross/schemas';
import { Card, TextField } from '@wasabi-cross/ui';
import { CATEGORY_LABEL, EQUIPMENT_LABEL, MUSCLE_GROUP_LABEL } from '../../lib/labels.ts';

export interface CatalogPickerProps {
  catalog: readonly Exercise[];
  /** Los `exerciseId` que el usuario ya tiene: se ven, pero no se pueden volver a elegir. */
  owned: ReadonlySet<string>;
  query: string;
  onQueryChange: (query: string) => void;
  onPick: (exercise: Exercise) => void;
}

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
 * tener que saber cómo se llaman. Elegir uno lleva al formulario con el nombre cargado.
 */
export function CatalogPicker({
  catalog,
  owned,
  query,
  onQueryChange,
  onPick,
}: CatalogPickerProps): React.JSX.Element {
  const results = catalog.filter((exercise) => nameMatches(exercise.name, query));

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
              {owned.has(exercise.id) ? (
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
