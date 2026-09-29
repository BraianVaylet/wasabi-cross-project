import {
  capacitySchema,
  disciplineSchema,
  equipmentSchema,
  exerciseCategorySchema,
  levelSchema,
  muscleGroupSchema,
  type AddExercise,
  type Capacity,
  type CatalogEntry,
  type Discipline,
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
  Tabs,
  TextArea,
  TextField,
} from '@wasabi-cross/ui';
import { useState } from 'react';
import { ErrorNotice } from '../../app/ErrorNotice.tsx';
import { autoColon } from '../../lib/format.ts';
import {
  CAPACITY_LABEL,
  DISCIPLINE_LABEL,
  EQUIPMENT_LABEL,
  MUSCLE_GROUP_LABEL,
  optionsFrom,
} from '../../lib/labels.ts';
import { EXTRA_FIELD, extraFieldKindFor, MARK_FIELD, today } from '../../lib/mark-input.ts';
import { CatalogPicker } from './CatalogPicker.tsx';
import {
  catalogNameMatch,
  definitionValuesOf,
  isEdited,
  kindFor,
  newExerciseSchema,
  toAddExercise,
  valuesFromCatalog,
  EMPTY_VALUES,
  type NewExerciseValues,
} from './form.ts';
import './new-exercise.css';

export type NewExerciseMode = 'catalogo' | 'crear';

const MODES: readonly { value: NewExerciseMode; label: string }[] = [
  { value: 'catalogo', label: 'Catálogo' },
  { value: 'crear', label: 'Crear' },
];

export interface NewExercisePageProps {
  catalog: CatalogEntry[];
  /** La pestaña activa: vive en la URL, así "atrás" vuelve a la otra. */
  mode: NewExerciseMode;
  onModeChange: (mode: NewExerciseMode) => void;
  /** El plan ya no admite más ejercicios propios: un precargado editado no entraría. */
  customLimitReached: boolean;
  onSubmit: (input: AddExercise) => void;
  pending: boolean;
  error: unknown;
}

const CATEGORIES: readonly { value: ExerciseCategory; label: string }[] = [
  { value: 'fuerza', label: 'Fuerza (RM en kg)' },
  { value: 'hipertrofia', label: 'Hipertrofia (repeticiones y peso)' },
  { value: 'gimnastico', label: 'Gimnástico (repeticiones)' },
  { value: 'running', label: 'Running (tiempo)' },
  { value: 'cardio', label: 'Cardio (metros y calorías)' },
  { value: 'distancia_carga', label: 'Distancia con carga (metros y peso)' },
];

const LEVELS: readonly { value: Level; label: string }[] = [
  { value: 'principiante', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
  { value: 'elite', label: 'Elite' },
];

const SIN_CATEGORIA = { label: 'Marca', placeholder: 'Elegí primero la categoría' };

/*
 * Qué entrena el ejercicio (spec §5.1) y con qué se hace. El segmento del cuerpo no está
 * acá porque no se pregunta: sale del grupo primario.
 */
const CAPACITIES = optionsFrom(CAPACITY_LABEL);
const MUSCLE_GROUPS = optionsFrom(MUSCLE_GROUP_LABEL);
const DISCIPLINES = optionsFrom(DISCIPLINE_LABEL);
const EQUIPMENT = optionsFrom(EQUIPMENT_LABEL);

/** Nuevo ejercicio (mockup 9): uno del catálogo o uno propio, con su primera marca. */
export function NewExercisePage({
  catalog,
  mode,
  onModeChange,
  customLimitReached,
  onSubmit,
  pending,
  error,
}: NewExercisePageProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [discipline, setDiscipline] = useState<Discipline | null>(null);

  const form = useForm({
    defaultValues: EMPTY_VALUES,
    validators: { onSubmit: newExerciseSchema },
    onSubmit: ({ value }) => {
      onSubmit(toAddExercise(value));
    },
  });

  /*
   * Cargar todos los campos de una vez. Es campo por campo y no `form.reset(values)`: cuando
   * se elige un precargado el formulario todavía no está montado (la pestaña activa es otra),
   * y `reset` no deja los valores donde los espera el formulario cuando aparece.
   */
  function load(values: NewExerciseValues): void {
    for (const key of Object.keys(values) as (keyof NewExerciseValues)[]) {
      form.setFieldValue(key, values[key]);
    }
    form.setErrorMap({ onSubmit: undefined });
  }

  return (
    <>
      <Link to="/" className="page__back">
        <span aria-hidden="true">‹</span> Ejercicios
      </Link>
      <h1 className="page__title">Nuevo ejercicio</h1>

      <Tabs label="Cómo agregar el ejercicio" tabs={MODES} value={mode} onChange={onModeChange}>
        {mode === 'catalogo' ? (
          <CatalogPicker
            catalog={catalog}
            query={query}
            onQueryChange={setQuery}
            discipline={discipline}
            onDisciplineChange={setDiscipline}
            onPick={(exercise) => {
              // El formulario se llena con toda su definición, y desde ahí se puede editar.
              load(valuesFromCatalog(exercise));
              onModeChange('crear');
            }}
          />
        ) : (
          <form
            className="new-exercise"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit();
            }}
          >
            <form.Subscribe selector={(state) => state.values}>
              {(values) => {
                const chosen = catalog.find((exercise) => exercise.id === values.catalogId);
                const edited = chosen !== undefined && isEdited(chosen, values);
                const similar =
                  chosen === undefined ? catalogNameMatch(catalog, values.name) : undefined;
                const kind = kindFor(values.category);
                const markField = kind ? MARK_FIELD[kind] : SIN_CATEGORIA;
                const extraKind = kind ? extraFieldKindFor(kind) : null;

                return (
                  <>
                    {chosen === undefined ? null : (
                      <div className="new-exercise__notice" role="status">
                        <p>
                          Partís de <strong>{chosen.name}</strong> del catálogo.
                          {edited
                            ? ' Cambiaste su definición: se va a guardar como ejercicio propio y cuenta para tu límite de propios.'
                            : ' Si cambiás algo de su definición, se guarda como ejercicio propio.'}
                        </p>
                        {edited && customLimitReached ? (
                          <p>
                            Tu plan no admite más ejercicios propios: volvé a los valores del
                            catálogo para poder guardarlo.
                          </p>
                        ) : null}
                        <div className="new-exercise__notice-actions">
                          {edited ? (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                const original = definitionValuesOf(chosen);
                                form.setFieldValue('name', original.name);
                                form.setFieldValue('category', original.category);
                                form.setFieldValue('capacities', original.capacities);
                                form.setFieldValue(
                                  'primaryMuscleGroup',
                                  original.primaryMuscleGroup,
                                );
                                form.setFieldValue(
                                  'secondaryMuscleGroups',
                                  original.secondaryMuscleGroups,
                                );
                                form.setFieldValue('disciplines', original.disciplines);
                                form.setFieldValue('equipment', original.equipment);
                              }}
                            >
                              Volver a los valores del catálogo
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            onClick={() => {
                              load(EMPTY_VALUES);
                            }}
                          >
                            Empezar de cero
                          </Button>
                        </div>
                      </div>
                    )}

                    <form.Field name="name">
                      {(field) => (
                        <TextField
                          label="Nombre"
                          autoComplete="off"
                          placeholder="Ej: Sentadilla del garage"
                          value={field.state.value}
                          onChange={(event) => {
                            field.handleChange(event.target.value);
                          }}
                          onBlur={field.handleBlur}
                          error={field.state.meta.errors[0]?.message}
                        />
                      )}
                    </form.Field>
                    {similar === undefined ? null : (
                      <p className="new-exercise__hint" role="status">
                        Ya hay un «{similar.name}» en el catálogo. Podés crearlo igual, o elegirlo
                        en la pestaña Catálogo.
                      </p>
                    )}

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
                            categoryField.handleChange(exerciseCategorySchema.parse(value));
                          }}
                          error={categoryField.state.meta.errors[0]?.message}
                        />
                      )}
                    </form.Field>

                    <form.Field name="capacities">
                      {(capacitiesField) => (
                        <CheckboxGroup
                          legend="Capacidades"
                          options={CAPACITIES}
                          values={capacitiesField.state.value}
                          onChange={(selected) => {
                            capacitiesField.handleChange(
                              selected.filter(
                                (value): value is Capacity =>
                                  capacitySchema.safeParse(value).success,
                              ),
                            );
                          }}
                          error={capacitiesField.state.meta.errors[0]?.message}
                        />
                      )}
                    </form.Field>

                    <form.Field name="primaryMuscleGroup">
                      {(primaryField) => (
                        <Select
                          label="Grupo muscular primario"
                          value={primaryField.state.value}
                          onChange={(event) => {
                            const primary = muscleGroupSchema.safeParse(event.target.value);
                            primaryField.handleChange(primary.success ? primary.data : '');
                            // El primario no puede ser también secundario.
                            form.setFieldValue(
                              'secondaryMuscleGroups',
                              values.secondaryMuscleGroups.filter(
                                (group) => !primary.success || group !== primary.data,
                              ),
                            );
                          }}
                          onBlur={primaryField.handleBlur}
                          error={primaryField.state.meta.errors[0]?.message}
                        >
                          <option value="" disabled>
                            Elegí el grupo primario
                          </option>
                          {MUSCLE_GROUPS.map((group) => (
                            <option key={group.value} value={group.value}>
                              {group.label}
                            </option>
                          ))}
                        </Select>
                      )}
                    </form.Field>

                    <form.Field name="secondaryMuscleGroups">
                      {(groupsField) => (
                        <CheckboxGroup
                          legend="Grupos musculares secundarios"
                          options={MUSCLE_GROUPS.filter(
                            (group) => group.value !== values.primaryMuscleGroup,
                          )}
                          values={groupsField.state.value}
                          onChange={(selected) => {
                            groupsField.handleChange(
                              selected.filter(
                                (value): value is MuscleGroup =>
                                  muscleGroupSchema.safeParse(value).success,
                              ),
                            );
                          }}
                          error={groupsField.state.meta.errors[0]?.message}
                        />
                      )}
                    </form.Field>

                    <form.Field name="disciplines">
                      {(disciplinesField) => (
                        <CheckboxGroup
                          legend="Disciplinas (opcional)"
                          options={DISCIPLINES}
                          values={disciplinesField.state.value}
                          onChange={(selected) => {
                            disciplinesField.handleChange(
                              selected.filter(
                                (value): value is Discipline =>
                                  disciplineSchema.safeParse(value).success,
                              ),
                            );
                          }}
                        />
                      )}
                    </form.Field>

                    <form.Field name="equipment">
                      {(equipmentField) => (
                        <Select
                          label="Equipo (opcional)"
                          value={equipmentField.state.value}
                          onChange={(event) => {
                            const equipment = equipmentSchema.safeParse(event.target.value);
                            equipmentField.handleChange(equipment.success ? equipment.data : '');
                          }}
                          onBlur={equipmentField.handleBlur}
                        >
                          <option value="">Sin especificar</option>
                          {EQUIPMENT.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </Select>
                      )}
                    </form.Field>

                    <form.Field name="value">
                      {(valueField) => (
                        <TextField
                          label={markField.label}
                          placeholder={markField.placeholder}
                          inputMode={kind === 'time' ? 'text' : 'decimal'}
                          value={valueField.state.value}
                          onChange={(event) => {
                            valueField.handleChange(
                              kind === 'time' ? autoColon(event.target.value) : event.target.value,
                            );
                          }}
                          onBlur={valueField.handleBlur}
                          error={valueField.state.meta.errors[0]?.message}
                        />
                      )}
                    </form.Field>

                    {extraKind === null ? null : (
                      <form.Field name="extra">
                        {(extraFormField) => (
                          <TextField
                            label={EXTRA_FIELD[extraKind].label}
                            placeholder={EXTRA_FIELD[extraKind].placeholder}
                            inputMode="decimal"
                            value={extraFormField.state.value}
                            onChange={(event) => {
                              extraFormField.handleChange(event.target.value);
                            }}
                            onBlur={extraFormField.handleBlur}
                            error={extraFormField.state.meta.errors[0]?.message}
                          />
                        )}
                      </form.Field>
                    )}
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
        )}
      </Tabs>
    </>
  );
}
