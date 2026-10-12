import type { Plan, SessionUser, UserPreferences } from '@wasabi-cross/schemas';
import type { UseQueryResult } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Avatar, Button, SectionHeader, Skeleton, Tag, TextField } from '@wasabi-cross/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorNotice } from '../../app/ErrorNotice.tsx';
import { PLAN_INFO } from '../../lib/plans.ts';
import { validatePercentages } from './percentages.ts';
import './profile.css';

export interface ProfilePageProps {
  user: SessionUser;
  /** De dónde se carga la foto, si el usuario tiene (`user.hasPhoto`). */
  photoUrl: string;
  preferences: UseQueryResult<UserPreferences>;
  onSave: (percentages: number[]) => void;
  saving: boolean;
  saved: boolean;
  saveError: unknown;
}

/**
 * Perfil (F1-16): quién es el usuario, su plan y los porcentajes de carga que ve por defecto. La
 * foto es la de su proveedor de ingreso (F9-08, spec §5.6).
 */
export function ProfilePage({
  user,
  photoUrl,
  preferences,
  onSave,
  saving,
  saved,
  saveError,
}: ProfilePageProps): React.JSX.Element {
  return (
    <>
      <h1 className="page__title">Perfil</h1>

      <AccountSection user={user} photoUrl={photoUrl} />

      <PlanSection plan={user.plan} />

      <section className="profile__section" aria-labelledby="profile-porcentajes">
        <SectionHeader id="profile-porcentajes" title="Porcentajes por defecto" />
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

/**
 * Quién es: la foto (o las iniciales), el nombre y el email. La foto se pide sólo si el usuario
 * tiene (`hasPhoto`), a la ruta de la API que no lleva id: cada uno puede pedir la suya y nada más.
 */
function AccountSection({
  user,
  photoUrl,
}: {
  user: SessionUser;
  photoUrl: string;
}): React.JSX.Element {
  return (
    <section className="profile__section" aria-labelledby="profile-cuenta">
      <SectionHeader id="profile-cuenta" title="Tu cuenta" />
      <div className="profile__account">
        <Avatar name={user.name} src={user.hasPhoto ? photoUrl : undefined} size="lg" />
        <div className="profile__identity">
          <p className="profile__name">{user.name}</p>
          <p className="profile__email">{user.email}</p>
        </div>
      </div>
    </section>
  );
}

/** Qué plan tiene el usuario y el camino a su suscripción (spec §5.5). */
function PlanSection({ plan }: { plan: Plan }): React.JSX.Element {
  const info = PLAN_INFO[plan];

  return (
    <section className="profile__section" aria-labelledby="profile-plan">
      <SectionHeader
        id="profile-plan"
        title="Tu plan"
        meta={<Tag variant={plan === 'pro' ? 'solid' : 'neutral'}>{info.name}</Tag>}
      />
      <p className="profile__hint">{info.summary}</p>
      <Link to="/suscripcion" className="wc-button wc-button--secondary wc-button--block">
        Administrar suscripción
      </Link>
    </section>
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
              variant="inline"
              inputMode="numeric"
              placeholder="—"
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
