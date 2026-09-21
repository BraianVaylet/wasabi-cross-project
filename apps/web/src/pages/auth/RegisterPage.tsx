import { signUpSchema, type SignUpRequest } from '@wasabi-cross/schemas';
import { useForm } from '@tanstack/react-form';
import { Link } from '@tanstack/react-router';
import { Button, TextField } from '@wasabi-cross/ui';
import { ErrorNotice } from '../../app/ErrorNotice.tsx';
import type { RedirectSearch } from '../../app/redirect.ts';
import { AuthScreen } from './AuthScreen.tsx';

export interface RegisterPageProps {
  search: RedirectSearch;
  onSubmit: (input: SignUpRequest) => void;
  pending: boolean;
  error: unknown;
}

/**
 * Crear una cuenta (mockup 3). El "Username" del mockup es el nombre visible, el del
 * "Hi, Braian!" de Home (spec §5): acá se llama Nombre.
 */
export function RegisterPage({
  search,
  onSubmit,
  pending,
  error,
}: RegisterPageProps): React.JSX.Element {
  const form = useForm({
    defaultValues: { email: '', name: '', password: '', confirmPassword: '' },
    validators: { onSubmit: signUpSchema },
    onSubmit: ({ value }) => {
      // La confirmación se queda acá: sirvió para detectar el error de tipeo y nada más.
      const { confirmPassword: _confirmation, ...request } = signUpSchema.parse(value);
      onSubmit(request);
    },
  });

  return (
    <AuthScreen
      greeting="¡Bienvenido!"
      title="Crear una cuenta"
      footer={
        <>
          ¿Ya tenés una?{' '}
          <Link to="/login" search={search}>
            Ya tengo cuenta
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

        <form.Field name="name">
          {(field) => (
            <TextField
              label="Nombre"
              autoComplete="nickname"
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
              autoComplete="new-password"
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
              }}
              onBlur={field.handleBlur}
              error={field.state.meta.errors[0]?.message}
            />
          )}
        </form.Field>

        <form.Field name="confirmPassword">
          {(field) => (
            <TextField
              label="Repetir contraseña"
              type="password"
              autoComplete="new-password"
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
              }}
              onBlur={field.handleBlur}
              error={field.state.meta.errors[0]?.message}
            />
          )}
        </form.Field>

        {error ? <ErrorNotice error={error} /> : null}

        <Button type="submit" block disabled={pending}>
          Crear cuenta
        </Button>
      </form>
    </AuthScreen>
  );
}
