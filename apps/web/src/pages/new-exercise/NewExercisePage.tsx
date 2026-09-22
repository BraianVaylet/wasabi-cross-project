import {
  capacitySchema,
  levelSchema,
  muscleGroupSchema,
  type AddExercise,
  type Capacity,
  type Exercise,
  type ExerciseCategory,
  type Level,
  type MuscleGroup,
} from '@wasabi-cross/schemas';
import { useForm } from '@tanstack/react-form';
import { Link } from '@tanstack/react-router';
import {
  Button,
  Checkbox,
  CheckboxGroup,
  RadioGroup,
  Select,
  TextArea,
  TextField,
} from '@wasabi-cross/ui';
import { useId } from 'react';
import { ErrorNotice } from '../../app/ErrorNotice.tsx';
import { CAPACITY_LABEL, MUSCLE_GROUP_LABEL, optionsFrom } from '../../lib/labels.ts';
import { MARK_FIELD, today } from '../../lib/mark-input.ts';
import {
  catalogMatch,
  kindFor,
  newExerciseSchemaFor,
  toAddExercise,
  EMPTY_VALUES,
} from './form.ts';
import './new-exercise.css';

export interface NewExercisePageProps {
  catalog: Exercise[];
  onSubmit: (input: AddExercise) => void;
  pending: boolean;
  error: unknown;
}

const CATEGORIES: readonly { value: ExerciseCategory; label: string }[] = [
  { value: 'fuerza', label: 'Fuerza (RM en kg)' },
  { value: 'hipertrofia', label: 'Hipertrofia (repeticiones)' },
  { value: 'gimnastico', label: 'Gimnástico (repeticiones)' },
  { value: 'running', label: 'Running (tiempo)' },
];

const LEVELS: readonly { value: Level; label: string }[] = [
  { value: 'principiante', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
  { value: 'elite', label: 'Elite' },
];

const SIN_CATEGORIA = { label: 'Marca', placeholder: 'Elegí primero la categoría' };

/*
 * Qué entrena el ejercicio (spec §5.1). Sólo se pregunta en uno propio: el del catálogo ya
 * lo trae cargado. El segmento del cuerpo no está acá porque no se pregunta: sale de los
 * grupos musculares.
 */
const CAPACITIES = optionsFrom(CAPACITY_LABEL);

const MUSCLE_GROUPS = optionsFrom(MUSCLE_GROUP_LABEL);

/** Nuevo ejercicio (mockup 9): uno del catálogo o uno propio, con su primera marca. */
export function NewExercisePage({
  catalog,
  onSubmit,
  pending,
  error,
}: NewExercisePageProps): React.JSX.Element {
  const catalogListId = useId();

  const form = useForm({
    defaultValues: EMPTY_VALUES,
    validators: { onSubmit: newExerciseSchemaFor(catalog) },
    onSubmit: ({ value }) => {
      onSubmit(toAddExercise(catalog, value));
    },
  });

  return (
    <>
      <Link to="/" className="page__back">
        <span aria-hidden="true">‹</span> Ejercicios
      </Link>
      <h1 className="page__title">Nuevo ejercicio</h1>

      <form
        className="new-exercise"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Field name="name">
          {(field) => (
            <>
              <TextField
                label="Nombre"
                list={catalogListId}
                autoComplete="off"
                placeholder="Ej: Clean, Back squat…"
                value={field.state.value}
                onChange={(event) => {
                  field.handleChange(event.target.value);
                }}
                onBlur={field.handleBlur}
                error={field.state.meta.errors[0]?.message}
              />
              {/* El catálogo como sugerencias del navegador: se busca con el teclado. */}
              <datalist id={catalogListId}>
                {catalog.map((exercise) => (
                  <option key={exercise.id} value={exercise.name} />
                ))}
              </datalist>
            </>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => [state.values.name, state.values.category] as const}>
          {([name, category]) => {
            const match = catalogMatch(catalog, name);
            const kind = kindFor(catalog, name, category);
            const field = kind ? MARK_FIELD[kind] : SIN_CATEGORIA;

            return (
              <>
                {match ? (
                  <p className="new-exercise__fixed">
                    <span className="new-exercise__fixed-label">Categoría</span>
                    {CATEGORIES.find((option) => option.value === match.category)?.label}
                  </p>
                ) : (
                  <form.Field name="category">
                    {(categoryField) => (
                      <RadioGroup
                        legend="Categoría"
                        name="category"
                        options={CATEGORIES}
                        value={
                          categoryField.state.value === '' ? undefined : categoryField.state.value
                        }
                        onChange={(value) => {
                          categoryField.handleChange(value);
                        }}
                        error={categoryField.state.meta.errors[0]?.message}
                      />
                    )}
                  </form.Field>
                )}

                {/* Sólo en uno propio: el del catálogo ya trae lo suyo (spec §5.1). */}
                {match ? null : (
                  <>
                    <form.Field name="capacities">
                      {(capacitiesField) => (
                        <CheckboxGroup
                          legend="Capacidades"
                          options={CAPACITIES}
                          values={capacitiesField.state.value}
                          onChange={(values) => {
                            capacitiesField.handleChange(
                              values.filter(
                                (value): value is Capacity =>
                                  capacitySchema.safeParse(value).success,
                              ),
                            );
                          }}
                          error={capacitiesField.state.meta.errors[0]?.message}
                        />
                      )}
                    </form.Field>

                    <form.Field name="muscleGroups">
                      {(groupsField) => (
                        <CheckboxGroup
                          legend="Grupos musculares"
                          options={MUSCLE_GROUPS}
                          values={groupsField.state.value}
                          onChange={(values) => {
                            groupsField.handleChange(
                              values.filter(
                                (value): value is MuscleGroup =>
                                  muscleGroupSchema.safeParse(value).success,
                              ),
                            );
                          }}
                          error={groupsField.state.meta.errors[0]?.message}
                        />
                      )}
                    </form.Field>
                  </>
                )}

                <form.Field name="value">
                  {(valueField) => (
                    <TextField
                      label={field.label}
                      placeholder={field.placeholder}
                      inputMode={kind === 'time' ? 'text' : 'decimal'}
                      value={valueField.state.value}
                      onChange={(event) => {
                        valueField.handleChange(event.target.value);
                      }}
                      onBlur={valueField.handleBlur}
                      error={valueField.state.meta.errors[0]?.message}
                    />
                  )}
                </form.Field>
              </>
            );
          }}
        </form.Subscribe>

        <form.Field name="date">
          {(field) => (
            <TextField
              label="Fecha"
              type="date"
              max={today()}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
              }}
              onBlur={field.handleBlur}
              error={field.state.meta.errors[0]?.message}
            />
          )}
        </form.Field>

        <form.Field name="level">
          {(field) => (
            <Select
              label="Nivel"
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(levelSchema.parse(event.target.value));
              }}
              onBlur={field.handleBlur}
              error={field.state.meta.errors[0]?.message}
            >
              <option value="" disabled>
                Elegí tu nivel
              </option>
              {LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </Select>
          )}
        </form.Field>

        <form.Field name="notes">
          {(field) => (
            <TextArea
              label="Comentarios (opcional)"
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
              }}
              onBlur={field.handleBlur}
              error={field.state.meta.errors[0]?.message}
            />
          )}
        </form.Field>

        <form.Field name="withPain">
          {(field) => (
            <Checkbox
              label="Con dolor"
              checked={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.checked);
              }}
            />
          )}
        </form.Field>

        {error ? <ErrorNotice error={error} /> : null}

        <Button type="submit" block disabled={pending}>
          Guardar ejercicio
        </Button>
      </form>
    </>
  );
}
