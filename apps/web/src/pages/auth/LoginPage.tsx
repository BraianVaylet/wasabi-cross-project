import type { OauthErrorCode, OauthProvider, OauthProviderInfo } from '@wasabi-cross/schemas';
import { ProviderButton, Skeleton, type ProviderMark } from '@wasabi-cross/ui';
import { CodeNotice, ErrorNotice } from '../../app/ErrorNotice.tsx';
import { AuthScreen } from './AuthScreen.tsx';

/** Qué logo lleva cada proveedor: los de verdad tienen el suyo; el de desarrollo, uno genérico. */
const MARKS = {
  google: 'google',
  microsoft: 'microsoft',
  'fake-idp': 'generic',
} as const satisfies Record<OauthProvider, ProviderMark>;

export interface ProvidersState {
  /** Los proveedores habilitados, en el orden en que va cada botón. */
  items: readonly OauthProviderInfo[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}

export interface LoginPageProps {
  providers: ProvidersState;
  /** El aviso con el que el proveedor devolvió al usuario (`?error=`), si volvió con uno. */
  returnError: OauthErrorCode | null;
  /** A qué proveedor se está yendo: ése muestra que trabaja y todos quedan sin poder apretarse. */
  entering: OauthProvider | null;
  /** Por qué no se pudo empezar el ingreso, si no se pudo. */
  enterError: unknown;
  onEnter: (provider: OauthProvider) => void;
}

const UNAVAILABLE = 'El ingreso no está disponible por ahora. Probá de nuevo en un rato.';

/**
 * Entrar o crear la cuenta (mockups 2 y 3 en una sola pantalla, F9-07, spec §5.6): es lo mismo,
 * porque no hay un registro aparte. No hay formulario: sólo un botón por proveedor habilitado. Si
 * la lista no carga o viene vacía no hay otra forma de entrar, y la pantalla lo dice.
 */
export function LoginPage({
  providers,
  returnError,
  entering,
  enterError,
  onEnter,
}: LoginPageProps): React.JSX.Element {
  const items = providers.items ?? [];

  return (
    <AuthScreen
      greeting="¡Bienvenido!"
      title="Entrar"
      footer={
        items.some((provider) => provider.id === 'microsoft')
          ? 'Con Microsoft, sólo cuentas personales (Outlook, Hotmail, Live).'
          : undefined
      }
    >
      <p className="auth__lead">
        Entrá o creá tu cuenta. Es lo mismo: si todavía no tenés una, se crea sola.
      </p>

      {/* El motivo por el que se volvió sin entrar: el mensaje del catálogo, nunca el del link. */}
      {returnError ? <CodeNotice code={returnError} /> : null}

      {providers.loading ? (
        <Skeleton label="Cargando las formas de entrar" count={2} />
      ) : items.length === 0 ? (
        // Sin proveedores no hay otra forma de entrar: vacía o caída, es lo mismo para la persona.
        // Si hay y un refresco en segundo plano falla (volver a la pestaña), los botones se quedan.
        <ErrorNotice error={providers.error} message={UNAVAILABLE} onRetry={providers.onRetry} />
      ) : (
        <div className="auth__providers">
          {items.map((provider) => (
            <ProviderButton
              key={provider.id}
              provider={MARKS[provider.id]}
              disabled={entering !== null}
              aria-busy={entering === provider.id ? true : undefined}
              onClick={() => {
                onEnter(provider.id);
              }}
            >
              Continuar con {provider.label}
            </ProviderButton>
          ))}
        </div>
      )}

      {enterError ? <ErrorNotice error={enterError} /> : null}
    </AuthScreen>
  );
}
