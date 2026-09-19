import type { ErrorCode } from '@wasabi-cross/schemas';
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import type { RouterHistory } from '@tanstack/react-router';
import { ApiError } from '../lib/http.ts';
import { createAppRouter, type AppRouter } from './router.tsx';
import { SESSION_QUERY_KEY, type SessionClient } from './session.ts';

/** Sin sesión, o sesión vencida (docs/error-codes.md). */
export const SESSION_EXPIRED_CODE: ErrorCode = 'WC-AUTH-401-004';

/** Un 4xx no se arregla reintentando; sin red o con la API caída, puede que sí. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  const clientError = error instanceof ApiError && error.status >= 400 && error.status < 500;
  return !clientError && failureCount < 2;
}

/**
 * Arma la app: el cliente de TanStack Query y el router, conectados. Si cualquier pedido a
 * la API responde que la sesión venció, se olvida la sesión y el router manda a login
 * recordando dónde estaba el usuario.
 */
export function createApp({
  session,
  history,
}: {
  session: SessionClient;
  history?: RouterHistory;
}): { queryClient: QueryClient; router: AppRouter } {
  const onError = (error: unknown): void => {
    if (error instanceof ApiError && error.errorCode === SESSION_EXPIRED_CODE) {
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
      void router.invalidate();
    }
  };

  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: { queries: { retry: shouldRetry } },
  });

  const router = createAppRouter({
    queryClient,
    session,
    ...(history === undefined ? {} : { history }),
  });

  return { queryClient, router };
}

/**
 * Después de entrar (F1-10): vuelve a pedir la sesión y deja que el router decida a dónde
 * ir. Login, con sesión, manda a donde el usuario iba.
 */
export async function refreshSession({
  queryClient,
  router,
}: {
  queryClient: QueryClient;
  router: AppRouter;
}): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY, refetchType: 'all' });
  await router.invalidate();
}
