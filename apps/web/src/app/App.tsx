import { QueryClientProvider, useQuery, type QueryClient } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { ErrorScreen } from './ErrorNotice.tsx';
import type { AppRouter } from './router.tsx';
import { sessionQueryOptions, type SessionClient } from './session.ts';
import { Splash } from './Splash.tsx';
import './app.css';

export interface AppProps {
  queryClient: QueryClient;
  router: AppRouter;
  session: SessionClient;
}

export function App({ queryClient, router, session }: AppProps): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionGate router={router} session={session} />
    </QueryClientProvider>
  );
}

/**
 * Hasta saber si hay sesión, el splash. Así el router arranca con la respuesta en caché y
 * nunca muestra una pantalla protegida para después sacarla.
 */
function SessionGate({ router, session }: Omit<AppProps, 'queryClient'>): React.JSX.Element {
  const query = useQuery(sessionQueryOptions(session));

  if (query.isPending) {
    return <Splash />;
  }
  if (query.isError) {
    return (
      <ErrorScreen
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }
  return <RouterProvider router={router} />;
}
