import {
  exerciseDefinitionSchema,
  levelSchema,
  sameName,
  type Level,
  type ManagedExerciseSummary,
  type UpdateManagedExercise,
} from '@wasabi-cross/schemas';
import { Link } from '@tanstack/react-router';
import { Button, Checkbox, Select, Skeleton, TextArea, TextField } from '@wasabi-cross/ui';
import { useState } from 'react';
import { ErrorNotice } from '../../app/ErrorNotice.tsx';
import './edit-exercise.css';

export interface EditExercisePageProps {
  exercise: ManagedExerciseSummary | undefined;
  loading: boolean;
  loadError: unknown;
  onSave: (change: UpdateManagedExercise) => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
  actionError: unknown;
}

const LEVELS: readonly { value: Level; label: string }[] = [
  { value: 'principiante', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
  { value: 'elite', label: 'Elite' },
];

/**
 * Editar lo que es del usuario sobre un ejercicio, y borrarlo (F1-15). Se llega desde el
 * lápiz del detalle (mockup 5).
 */
export function EditExercisePage({
  exercise,
  loading,
  loadError,
  onSave,
  onDelete,
  saving,
  deleting,
  actionError,
}: EditExercisePageProps): React.JSX.Element {
  return (
    <>
      {exercise ? (
        <Link to="/ejercicios/$id" params={{ id: exercise.id }} className="page__back">
          <span aria-hidden="true">‹</span> Volver al ejercicio
        </Link>
      ) : (
        <Link to="/" className="page__back">
          <span aria-hidden="true">‹</span> Ejercicios
        </Link>
      )}

      {loading ? <Skeleton label="Cargando el ejercicio" count={3} /> : null}
      {loadError ? <ErrorNotice error={loadError} /> : null}

      {!loading && !loadError && !exercise ? (
        <div className="edit__missing">
          <p>No encontramos ese ejercicio.</p>
          <Link to="/">Volver a tus ejercicios</Link>
        </div>
      ) : null}

      {exercise ? (
        <EditForm
          exercise={exercise}
          onSave={onSave}
          onDelete={onDelete}
          saving={saving}
          deleting={deleting}
          actionError={actionError}
        />
      ) : null}
    </>
  );
}

interface EditFormProps {
  exercise: ManagedExerciseSummary;
  onSave: (change: UpdateManagedExercise) => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
  actionError: unknown;
}

function EditForm({
  exercise,
  onSave,
  onDelete,
  saving,
  deleting,
  actionError,
}: EditFormProps): React.JSX.Element {
  const [name, setName] = useState(exercise.name);
  const [level, setLevel] = useState<Level>(exercise.level);
  const [withPain, setWithPain] = useState(exercise.withPain);
  const [notes, setNotes] = useState(exercise.notes ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [nothingChanged, setNothingChanged] = useState(false);

  const submit = () => {
    setNothingChanged(false);

    /*
     * Sólo lo que cambió: mandar todo pisaría con lo mismo y, en un ejercicio del catálogo,
     * mandaría un nombre que la API rechaza por definición.
     */
    const change: UpdateManagedExercise = {
      ...(level === exercise.level ? {} : { level }),
      ...(withPain === exercise.withPain ? {} : { withPain }),
      ...(notes === (exercise.notes ?? '') ? {} : { notes }),
      ...(exercise.isCustom && name !== exercise.name ? { name } : {}),
    };

    if (exercise.isCustom && name !== exercise.name) {
      const parsed = exerciseDefinitionSchema.shape.name.safeParse(name);
      if (!parsed.success) {
        setNameError(parsed.error.issues[0]?.message ?? 'Nombre inválido');
        return;
      }
    }
    setNameError(null);

    if (Object.keys(change).length === 0) {
      setNothingChanged(true);
      return;
    }

    onSave(change);
  };

  return (
    <>
      <h1 className="page__title">Editar ejercicio</h1>

      <form
        className="edit__form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {exercise.isCustom ? (
          <TextField
            label="Nombre"
            value={name}
            error={nameError ?? undefined}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
        ) : (
          // El nombre de uno del catálogo no se cambia: lo comparten todos los usuarios.
          <p className="edit__fixed">
            <span className="edit__fixed-label">Nombre</span>
            {exercise.name}
          </p>
        )}

        <Select
          label="Nivel"
          value={level}
          onChange={(event) => {
            setLevel(levelSchema.parse(event.target.value));
          }}
        >
          {LEVELS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <TextArea
          label="Comentarios"
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
          }}
        />

        <Checkbox
          label="Con dolor"
          checked={withPain}
          onChange={(event) => {
            setWithPain(event.target.checked);
          }}
        />

        {actionError ? <ErrorNotice error={actionError} /> : null}
        {nothingChanged ? <p role="status">No cambiaste nada todavía.</p> : null}

        <Button type="submit" block disabled={saving}>
          Guardar cambios
        </Button>
      </form>

      <DeleteSection exercise={exercise} onDelete={onDelete} deleting={deleting} />
    </>
  );
}

function DeleteSection({
  exercise,
  onDelete,
  deleting,
}: {
  exercise: ManagedExerciseSummary;
  onDelete: () => void;
  deleting: boolean;
}): React.JSX.Element {
  const [confirmation, setConfirmation] = useState('');
  // La misma comparación que usa el resto de la app: no distingue mayúsculas ni acentos.
  const confirmed = confirmation.trim() !== '' && sameName(confirmation, exercise.name);

  return (
    <section className="edit__danger" aria-labelledby="edit-borrar">
      <h2 id="edit-borrar" className="edit__danger-title">
        Borrar ejercicio
      </h2>
      <p className="edit__danger-warning">
        Se va de tu lista con todas sus marcas, y no se puede deshacer.
      </p>

      <TextField
        label={`Escribí "${exercise.name}" para confirmar`}
        value={confirmation}
        autoComplete="off"
        onChange={(event) => {
          setConfirmation(event.target.value);
        }}
      />

      <Button variant="danger" block disabled={!confirmed || deleting} onClick={onDelete}>
        Borrar ejercicio
      </Button>
    </section>
  );
}
