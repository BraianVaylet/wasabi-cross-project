import {
  canViewStats,
  oauthErrorFor,
  statsPeriodSchema,
  type AddExercise,
  type OauthErrorCode,
  type OauthProvider,
  type RecordInput,
  type UpdateManagedExercise,
} from '@wasabi-cross/schemas';
import { useInfiniteQuery, useMutation, useQuery, type QueryClient } from '@tanstack/react-query';
import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
  useNavigate,
  type RouterHistory,
} from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { HomePage } from '../pages/HomePage.tsx';
import { LoginPage } from '../pages/auth/LoginPage.tsx';
import { NotFoundPage } from '../pages/NotFoundPage.tsx';
import { NewExercisePage } from '../pages/new-exercise/NewExercisePage.tsx';
import { EditExercisePage } from '../pages/edit-exercise/EditExercisePage.tsx';
import { ExerciseDetailPage } from '../pages/exercise-detail/ExerciseDetailPage.tsx';
import { ProfilePage } from '../pages/profile/ProfilePage.tsx';
import { SubscriptionPage } from '../pages/subscription/SubscriptionPage.tsx';
import { StatsPage } from '../pages/stats/StatsPage.tsx';
import {
  catalogQueryOptions,
  exerciseListQueryOptions,
  exerciseStatsQueryOptions,
  generalStatsQueryOptions,
  trainingActivityQueryOptions,
  trainingBreakdownQueryOptions,
  historyQueryKey,
  historyQueryOptions,
  preferencesQueryOptions,
  CATALOG_QUERY_KEY,
  EXERCISES_QUERY_KEY,
  PREFERENCES_QUERY_KEY,
  type ApiClient,
} from './api.ts';
import { ErrorScreen } from './ErrorNotice.tsx';
import { isStatsLocked } from './StatsLocked.tsx';
import { optimisticId, prependRecord, type HistoryPages } from './optimistic-history.ts';
import { safeRedirect, type RedirectSearch } from './redirect.ts';
import {
  SESSION_QUERY_KEY,
  providersQueryOptions,
  sessionQueryOptions,
  type SessionClient,
} from './session.ts';
import { AppShell } from './shell/AppShell.tsx';

export interface RouterContext {
  queryClient: QueryClient;
  session: SessionClient;
  api: ApiClient;
  /** De dónde se carga la foto del usuario (`<img src>`): no es un pedido de la API del front. */
  photoUrl: string;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  notFoundComponent: NotFoundPage,
  errorComponent: ({ error }) => <ErrorScreen error={error} />,
});

/*
 * Lo que llega a `/login` en la URL. El `redirect` es a dónde volver: si no es texto, se ignora, y
 * que sea interno lo decide `safeRedirect` al usarlo. El `error` lo agrega la API cuando el
 * proveedor devuelve al usuario sin que haya entrado (F9-07): es de cualquiera que arme un link,
 * así que se acepta lo que venga y `oauthErrorFor` lo baja a un código del catálogo.
 */
const loginSearch = z.object({
  redirect: z.string().optional().catch(undefined),
  error: z.unknown().optional(),
});

/**
 * La pantalla pública (F1-10). Con sesión no hay nada que hacer acá: se va a donde el usuario
 * iba. `beforeLoad` corre otra vez cuando el router se invalida, así que volver del proveedor con
 * la sesión abierta redirige solo.
 */
function beforeLoadPublic(): (opts: {
  context: RouterContext;
  search: RedirectSearch;
}) => Promise<void> {
  return async ({ context, search }) => {
    const user = await context.queryClient.query(sessionQueryOptions(context.session));
    if (user) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- así redirige TanStack Router
      throw redirect({ href: safeRedirect(search.redirect) });
    }
  };
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search) => loginSearch.parse(search),
  beforeLoad: beforeLoadPublic(),
  component: function LoginRoute() {
    const { session } = loginRoute.useRouteContext();
    const { redirect: back, error } = loginRoute.useSearch();
    const navigate = useNavigate();
    const providers = useQuery(providersQueryOptions(session));
    // El ingreso navega fuera de la app: no hay nada que refrescar al terminar el pedido.
    const enter = useMutation({
      mutationFn: (provider: OauthProvider) =>
        session.signInWithProvider(provider, { redirect: back }),
    });
    const [returnError, setReturnError] = useState<OauthErrorCode | null>(null);

    // El `?error=` se muestra una vez y sale de la URL, para que un reload o un link copiado no
    // vuelvan a avisar de algo que ya pasó. A dónde iba el usuario, en cambio, se conserva.
    useEffect(() => {
      if (error === undefined) {
        return;
      }
      setReturnError(oauthErrorFor(error));
      void navigate({
        to: '.',
        search: back === undefined ? {} : { redirect: back },
        replace: true,
      });
    }, [error, back, navigate]);

    return (
      <LoginPage
        providers={{
          items: providers.data,
          loading: providers.isPending,
          error: providers.error,
          onRetry: () => {
            void providers.refetch();
          },
        }}
        returnError={returnError}
        // También después de pedir la URL: la página se está yendo, y habilitar los botones en el
        // medio dejaría apretar dos veces. Si el pedido falla, sí se vuelven a habilitar.
        entering={enter.isPending || enter.isSuccess ? enter.variables : null}
        enterError={enter.error}
        onEnter={(provider) => {
          enter.mutate(provider);
        }}
      />
    );
  },
});

/** Todo lo que cuelga de acá pide sesión y va dentro del shell: header y menú. */
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.query(sessionQueryOptions(context.session));
    if (!user) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- así redirige TanStack Router
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
    return { user };
  },
  component: function ShellRoute() {
    const { queryClient, session, user } = appRoute.useRouteContext();
    const navigate = useNavigate();
    const signOut = useMutation({
      mutationFn: () => session.signOut(),
      onSuccess: async () => {
        queryClient.setQueryData(SESSION_QUERY_KEY, null);
        await navigate({ to: '/login', search: {} });
      },
    });

    return (
      <AppShell
        plan={user.plan}
        onSignOut={() => {
          signOut.mutate();
        }}
        signingOut={signOut.isPending}
        signOutError={signOut.error}
      >
        <Outlet />
      </AppShell>
    );
  },
});

const homeRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  component: function HomeRoute() {
    const { user, api } = appRoute.useRouteContext();
    const exercises = useQuery(exerciseListQueryOptions(api));

    return <HomePage user={user} exercises={exercises} />;
  },
});

/* La pestaña del alta vive en la URL: sin `modo` se abre el catálogo, la entrada de siempre. */
const newExerciseSearch = z.object({
  modo: z.enum(['catalogo', 'crear']).optional().catch(undefined),
});

const newExerciseRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/ejercicios/nuevo',
  validateSearch: (search) => newExerciseSearch.parse(search),
  component: function NewExerciseRoute() {
    const { api, queryClient } = appRoute.useRouteContext();
    const { modo = 'catalogo' } = newExerciseRoute.useSearch();
    const navigate = useNavigate();
    const catalog = useQuery(catalogQueryOptions(api));
    const add = useMutation({
      mutationFn: (input: AddExercise) => api.addExercise(input),
      onSuccess: async () => {
        // La lista de Home quedó vieja: que se vuelva a pedir.
        await queryClient.invalidateQueries({ queryKey: EXERCISES_QUERY_KEY });
        // Y el catálogo: el que se acaba de agregar pasa a decir "ya lo tenés".
        await queryClient.invalidateQueries({ queryKey: CATALOG_QUERY_KEY });
        // Y las estadísticas: el ejercicio nuevo cuenta en el reparto y en el resumen.
        await queryClient.invalidateQueries({ queryKey: ['stats'] });
        await navigate({ to: '/' });
      },
    });

    return (
      <NewExercisePage
        catalog={catalog.data ?? []}
        mode={modo}
        onModeChange={(next) => {
          void navigate({ to: '/ejercicios/nuevo', search: { modo: next } });
        }}
        pending={add.isPending}
        error={add.error}
        onSubmit={(input) => {
          add.mutate(input);
        }}
      />
    );
  },
});

/*
 * El porcentaje elegido vive en la URL: un link a `?pct=80` abre el detalle con esa carga.
 * Si llega cualquier otra cosa, se ignora en vez de romper la pantalla.
 */
const detailSearch = z.object({
  pct: z.coerce.number().int().min(1).max(100).optional().catch(undefined),
});

const exerciseDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/ejercicios/$id',
  validateSearch: (search) => detailSearch.parse(search),
  component: function ExerciseDetailRoute() {
    const { api, queryClient, user } = appRoute.useRouteContext();
    const { id } = exerciseDetailRoute.useParams();
    const { pct } = exerciseDetailRoute.useSearch();
    const navigate = useNavigate();
    const exercises = useQuery(exerciseListQueryOptions(api));
    const preferences = useQuery(preferencesQueryOptions(api));
    const history = useInfiniteQuery(historyQueryOptions(api, id));
    // El progreso del detalle mira todo el historial, no un período (spec §5.2). Es una
    // estadística: con plan Free no se pide (spec §4).
    const canView = canViewStats(user.plan);
    const progress = useQuery({
      ...exerciseStatsQueryOptions(api, id, 'todo'),
      enabled: canView,
    });
    const progressLocked = !canView || isStatsLocked(progress.error);
    const exercise = exercises.data?.exercises.find((item) => item.id === id);

    /*
     * La marca aparece en el historial apenas se aprieta Guardar (spec §11). Si la API la
     * rechaza se vuelve al historial de antes y la pantalla dice por qué.
     */
    const logMark = useMutation({
      mutationFn: (input: RecordInput) => api.logRecord(id, input),
      onMutate: async (input) => {
        // Si hay un pedido del historial en vuelo, su respuesta pisaría la marca optimista.
        await queryClient.cancelQueries({ queryKey: historyQueryKey(id) });
        const previous = queryClient.getQueryData<HistoryPages>(historyQueryKey(id));

        queryClient.setQueryData<HistoryPages>(historyQueryKey(id), (old) =>
          prependRecord(old, {
            id: optimisticId(),
            value: input.value,
            unit: exercise?.current.unit ?? 'kg',
            performedAt: input.performedAt ?? new Date().toISOString(),
            ...(input.notes === undefined ? {} : { notes: input.notes }),
          }),
        );

        return { previous };
      },
      onError: (_error, _input, context) => {
        queryClient.setQueryData(historyQueryKey(id), context?.previous);
      },
      onSettled: () => {
        // La marca puede haber cambiado el valor actual y la mejor: los dos salen de la API.
        // Sin `await`: React Query recién marca el error cuando termina `onSettled`, y un
        // historial lento dejaría el motivo del rechazo esperando a un pedido que no importa.
        void queryClient.invalidateQueries({ queryKey: historyQueryKey(id) });
        void queryClient.invalidateQueries({ queryKey: EXERCISES_QUERY_KEY });
        // Y las estadísticas: el progreso del detalle y la cantidad de registros cambian.
        void queryClient.invalidateQueries({ queryKey: ['stats'] });
      },
    });

    return (
      <ExerciseDetailPage
        progress={{
          stats: progress.data,
          // Un pedido apagado queda "pendiente" para siempre: no es una carga.
          loading: !progressLocked && progress.isPending,
          error: progressLocked ? null : progress.error,
          locked: progressLocked,
        }}
        history={{
          records: history.data?.pages.flatMap((page) => page.records) ?? [],
          best: history.data?.pages[0]?.best,
          loading: history.isPending,
          error: history.error,
          hasMore: history.hasNextPage,
          loadingMore: history.isFetchingNextPage,
          onMore: () => {
            void history.fetchNextPage();
          },
        }}
        mark={{
          saving: logMark.isPending,
          error: logMark.error,
          onSave: (input) => {
            logMark.mutate(input);
          },
        }}
        exercise={exercise}
        percentages={preferences.data?.loadPercentages ?? []}
        loading={exercises.isPending || preferences.isPending}
        error={exercises.error ?? preferences.error}
        selected={pct}
        onSelect={(percentage) => {
          // `replace`: elegir porcentajes no llena el historial del navegador.
          void navigate({ to: '.', search: { pct: percentage }, replace: true });
        }}
      />
    );
  },
});

const editExerciseRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/ejercicios/$id/editar',
  component: function EditExerciseRoute() {
    const { api, queryClient } = appRoute.useRouteContext();
    const { id } = editExerciseRoute.useParams();
    const navigate = useNavigate();
    const exercises = useQuery(exerciseListQueryOptions(api));
    const exercise = exercises.data?.exercises.find((item) => item.id === id);

    // La lista y las estadísticas: un ejercicio borrado deja de contar en el reparto.
    const refreshList = () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: EXERCISES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['stats'] }),
      ]);

    const save = useMutation({
      mutationFn: (change: UpdateManagedExercise) => api.updateExercise(id, change),
      onSuccess: async () => {
        await refreshList();
        await navigate({ to: '/ejercicios/$id', params: { id }, search: {} });
      },
    });

    const remove = useMutation({
      mutationFn: () => api.deleteExercise(id),
      onSuccess: async () => {
        await refreshList();
        await navigate({ to: '/' });
      },
    });

    return (
      <EditExercisePage
        exercise={exercise}
        loading={exercises.isPending}
        loadError={exercises.error}
        saving={save.isPending}
        deleting={remove.isPending}
        actionError={save.error ?? remove.error}
        onSave={(change) => {
          save.mutate(change);
        }}
        onDelete={() => {
          remove.mutate();
        }}
      />
    );
  },
});

const profileRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/perfil',
  component: function ProfileRoute() {
    const { api, queryClient, user, photoUrl } = appRoute.useRouteContext();
    const preferences = useQuery(preferencesQueryOptions(api));
    const savePercentages = useMutation({
      mutationFn: (loadPercentages: number[]) => api.savePreferences({ loadPercentages }),
      onSuccess: (saved) => {
        queryClient.setQueryData(PREFERENCES_QUERY_KEY, saved);
      },
    });

    return (
      <ProfilePage
        user={user}
        photoUrl={photoUrl}
        preferences={preferences}
        saving={savePercentages.isPending}
        saved={savePercentages.isSuccess}
        saveError={savePercentages.error}
        onSave={(percentages) => {
          savePercentages.mutate(percentages);
        }}
      />
    );
  },
});

/* Suscripción (F8-04, spec §5.5): sólo la UI, no hay pasarela de pago todavía. */
const subscriptionRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/suscripcion',
  component: function SubscriptionRoute() {
    const { user } = appRoute.useRouteContext();

    return <SubscriptionPage plan={user.plan} />;
  },
});

/*
 * Cuál está abierto vive en la URL (mockup 10): un link a `?abierto=mex_...` abre esa
 * evolución, y es lo que usa el botón del detalle. Un ID inventado no rompe la pantalla:
 * simplemente no coincide con ninguna fila.
 */
/** Lo que se mira si el usuario no eligió nada (F2-01 lo define igual en la API). */
const DEFAULT_STATS_PERIOD = '12m';

const statsSearch = z.object({
  abierto: z.string().optional().catch(undefined),
  // Opcional: mientras el usuario no elija, la URL no lleva ruido. Un período inventado
  // tampoco rompe la pantalla: se ignora y se usa el de siempre.
  periodo: statsPeriodSchema.optional().catch(undefined),
});

const statsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/estadisticas',
  validateSearch: (search) => statsSearch.parse(search),
  component: function StatsRoute() {
    const { api, user } = appRoute.useRouteContext();
    const { abierto, periodo } = statsRoute.useSearch();
    const period = periodo ?? DEFAULT_STATS_PERIOD;
    const navigate = useNavigate();
    const exercises = useQuery(exerciseListQueryOptions(api));
    // Con plan Free no sale ningún pedido a las estadísticas (spec §4): el aviso ocupa su lugar.
    const canView = canViewStats(user.plan);

    // Sólo la del que está abierto: en una lista de diez, nueve consultas no las mira nadie.
    const stats = useQuery({
      ...exerciseStatsQueryOptions(api, abierto ?? '', period),
      enabled: canView && abierto !== undefined,
    });
    const general = useQuery({ ...generalStatsQueryOptions(api, period), enabled: canView });
    const activity = useQuery({ ...trainingActivityQueryOptions(api, period), enabled: canView });
    const breakdown = useQuery({ ...trainingBreakdownQueryOptions(api), enabled: canView });
    // Si la API dice que el plan no las incluye (cambió en otro dispositivo), lo mismo.
    const locked =
      !canView || [stats, general, activity, breakdown].some((q) => isStatsLocked(q.error));

    return (
      <StatsPage
        locked={locked}
        exercises={exercises}
        open={abierto}
        stats={abierto === undefined ? null : stats}
        general={general}
        activity={activity}
        breakdown={breakdown}
        period={period}
        onPeriodChange={(elegido) => {
          // El período y lo abierto se escriben juntos: son toda la búsqueda de la ruta.
          void navigate({
            to: '.',
            search: abierto === undefined ? { periodo: elegido } : { periodo: elegido, abierto },
            replace: true,
          });
        }}
        onToggle={(id) => {
          const conPeriodo = periodo === undefined ? {} : { periodo };
          void navigate({
            to: '.',
            search: id === abierto ? conPeriodo : { ...conPeriodo, abierto: id },
            replace: true,
          });
        }}
      />
    );
  },
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([
    homeRoute,
    newExerciseRoute,
    exerciseDetailRoute,
    editExerciseRoute,
    statsRoute,
    profileRoute,
    subscriptionRoute,
  ]),
]);

export function createAppRouter(options: RouterContext & { history?: RouterHistory }) {
  const { history, ...context } = options;
  return createRouter({
    routeTree,
    context,
    ...(history === undefined ? {} : { history }),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter;
  }
}
