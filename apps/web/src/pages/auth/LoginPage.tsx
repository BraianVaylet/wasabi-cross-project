import { signInSchema, type SignIn } from '@wasabi-cross/schemas';
import { useForm } from '@tanstack/react-form';
import { Link } from '@tanstack/react-router';
import { Button, TextField } from '@wasabi-cross/ui';
import { ErrorNotice } from '../../app/ErrorNotice.tsx';
import type { RedirectSearch } from '../../app/redirect.ts';
import { AuthScreen } from './AuthScreen.tsx';

export interface LoginPageProps {
  /** Se conserva para que el link a registro no pierda a dónde iba el usuario. */
  search: RedirectSearch;
  onSubmit: (credentials: SignIn) => void;
  pending: boolean;
  error: unknown;
}

/**
 * Entrar (mockup 2). Del mockup quedan afuera el login con Google y el recupero de
 * contraseña: los dos están fuera de la Fase 1 (spec §5, ACTION-PLAN).
 */
export function LoginPage({ search, onSubmit, pending, error }: LoginPageProps): React.JSX.Element {
  const form = useForm({
    defaultValues: { email: '', password: '' },
    validators: { onSubmit: signInSchema },
    onSubmit: ({ value }) => {
      // `parse` y no el valor crudo: deja el email normalizado, como lo guarda la API.
      onSubmit(signInSchema.parse(value));
    },
  });

  return (
    <AuthScreen
      greeting="¡Qué bueno verte de nuevo!"
      title="Entrar"
      footer={
        <>
          ¿Todavía no tenés cuenta?{' '}
          <Link to="/registro" search={search}>
            Crear una cuenta
          </Link>
        </>
      }
    >
      <form
        className="auth__form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Field name="email">
          {(field) => (
            <TextField
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
              }}
              onBlur={field.handleBlur}
              error={field.state.meta.errors[0]?.message}
            />
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <TextField
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
              }}
              onBlur={field.handleBlur}
              error={field.state.meta.errors[0]?.message}
            />
          )}
        </form.Field>

        {/* El error de la API no se reparte por campo: decir cuál falló diría si el email
            existe (spec §13). */}
        {error ? <ErrorNotice error={error} /> : null}

        <Button type="submit" block disabled={pending}>
          Entrar
        </Button>
      </form>
    </AuthScreen>
  );
}
