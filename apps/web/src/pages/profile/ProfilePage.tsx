import type { Theme, UserPreferences } from '@wasabi-cross/schemas';
import type { UseQueryResult } from '@tanstack/react-query';
import { Button, Skeleton, TextField, ThemeToggle } from '@wasabi-cross/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorNotice } from '../../app/ErrorNotice.tsx';
import { validatePercentages } from './percentages.ts';
import './profile.css';

export interface ProfilePageProps {
  preferences: UseQueryResult<UserPreferences>;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onSave: (percentages: number[]) => void;
  saving: boolean;
  saved: boolean;
  saveError: unknown;
}

/** Perfil (F1-16): el tema y los porcentajes de carga que el usuario ve por defecto. */
export function ProfilePage({
  preferences,
  theme,
  onThemeChange,
  onSave,
  saving,
  saved,
  saveError,
}: ProfilePageProps): React.JSX.Element {
  return (
    <>
      <h1 className="page__title">Perfil</h1>

      <section className="profile__section" aria-labelledby="profile-tema">
        <h2 id="profile-tema" className="profile__heading">
          Tema
        </h2>
        <div className="profile__theme">
          <span>{theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
          <ThemeToggle
            theme={theme}
            onToggle={() => {
              onThemeChange(theme === 'dark' ? 'light' : 'dark');
            }}
          />
        </div>
      </section>

      <section className="profile__section" aria-labelledby="profile-porcentajes">
        <h2 id="profile-porcentajes" className="profile__heading">
          Porcentajes por defecto
        </h2>
        <p className="profile__hint">
          Los que se muestran en la tabla de cada ejercicio de fuerza, hipertrofia o gimnástico.
        </p>

        {preferences.isPending ? <Skeleton label="Cargando tus preferencias" count={3} /> : null}
        {preferences.isError ? (
          <ErrorNotice
            error={preferences.error}
            onRetry={() => {
              void preferences.refetch();
            }}
          />
        ) : null}
        {preferences.data ? (
          <PercentagesForm
            initial={preferences.data.loadPercentages}
            onSave={onSave}
            saving={saving}
            saved={saved}
            saveError={saveError}
          />
        ) : null}
      </section>
    </>
  );
}

interface PercentagesFormProps {
  initial: number[];
  onSave: (percentages: number[]) => void;
  saving: boolean;
  saved: boolean;
  saveError: unknown;
}

function PercentagesForm({
  initial,
  onSave,
  saving,
  saved,
  saveError,
}: PercentagesFormProps): React.JSX.Element {
  /*
   * Cada fila lleva su propio id y no su posición: al quitar una del medio, React tiene que
   * sacar esa fila y no recomponer las de abajo con los valores corridos.
   */
  const nextId = useRef(0);
  const toRows = useCallback(
    (percentages: number[]) =>
      percentages.map((percentage) => ({ id: nextId.current++, value: String(percentage) })),
    [],
  );

  const [rows, setRows] = useState(() => toRows(initial));
  const [errors, setErrors] = useState<{ fields: Record<number, string>; group?: string }>({
    fields: {},
  });

  // Si la API trae otros porcentajes (otro dispositivo, o lo que respondió el guardado), mandan.
  useEffect(() => {
    setRows(toRows(initial));
  }, [initial, toRows]);

  const submit = () => {
    const result = validatePercentages(rows.map((row) => row.value));
    if (!result.ok) {
      setErrors({
        fields: result.fields,
        ...(result.group === undefined ? {} : { group: result.group }),
      });
      return;
    }

    setErrors({ fields: {} });
    onSave(result.percentages);
  };

  return (
    <form
      className="profile__form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <ul className="profile__percentages">
        {rows.map((row, index) => (
          <li key={row.id} className="profile__percentage">
            <TextField
              label={`Porcentaje ${String(index + 1)}`}
              inputMode="numeric"
              suffix="%"
              value={row.value}
              onChange={(event) => {
                const { value } = event.target;
                setRows((current) =>
                  current.map((item) => (item.id === row.id ? { ...item, value } : item)),
                );
              }}
              error={errors.fields[index]}
            />
            <Button
              variant="ghost"
              aria-label={`Quitar el porcentaje ${String(index + 1)}`}
              onClick={() => {
                setRows((current) => current.filter((item) => item.id !== row.id));
                setErrors({ fields: {} });
              }}
            >
              Quitar
            </Button>
          </li>
        ))}
      </ul>

      {errors.group ? (
        <p className="profile__group-error" role="alert">
          {errors.group}
        </p>
      ) : null}

      <div className="profile__actions">
        <Button
          variant="secondary"
          onClick={() => {
            setRows((current) => [...current, { id: nextId.current++, value: '' }]);
          }}
        >
          Agregar porcentaje
        </Button>
        <Button type="submit" disabled={saving}>
          Guardar porcentajes
        </Button>
      </div>

      {saveError ? <ErrorNotice error={saveError} /> : null}
      {saved && !saveError ? <p role="status">Guardamos tus porcentajes.</p> : null}
    </form>
  );
}
