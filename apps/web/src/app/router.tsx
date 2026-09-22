import type {
  AddExercise,
  RecordInput,
  SignIn,
  SignUpRequest,
  UpdateManagedExercise,
} from '@wasabi-cross/schemas';
import { useInfiniteQuery, useMutation, useQuery, type QueryClient } from '@tanstack/react-query';
import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
  useNavigate,
  useRouter,
  type RouterHistory,
} from '@tanstack/react-router';
import { z } from 'zod';
import { HomePage } from '../pages/HomePage.tsx';
import { LoginPage } from '../pages/auth/LoginPage.tsx';
import { RegisterPage } from '../pages/auth/RegisterPage.tsx';
import { NotFoundPage } from '../pages/NotFoundPage.tsx';
import { NewExercisePage } from '../pages/new-exercise/NewExercisePage.tsx';
import { EditExercisePage } from '../pages/edit-exercise/EditExercisePage.tsx';
import { ExerciseDetailPage } from '../pages/exercise-detail/ExerciseDetailPage.tsx';
import { ProfilePage } from '../pages/profile/ProfilePage.tsx';
import { StatsPage } from '../pages/stats/StatsPage.tsx';
import { refreshSession } from './create-app.ts';
import {
  catalogQueryOptions,
  exerciseListQueryOptions,
  exerciseStatsQueryOptions,
  historyQueryKey,
  historyQueryOptions,
  preferencesQueryOptions,
  EXERCISES_QUERY_KEY,
  PREFERENCES_QUERY_KEY,
  type ApiClient,
} from './api.ts';
import { ErrorScreen } from './ErrorNotice.tsx';
import { optimisticId, prependRecord, type HistoryPages } from './optimistic-history.ts';
import { safeRedirect, type RedirectSearch } from './redirect.ts';
import { SESSION_QUERY_KEY, sessionQueryOptions, type SessionClient } from './session.ts';
import { AppShell } from './shell/AppShell.tsx';
import { useSyncedTheme } from './use-synced-theme.ts';

export interface RouterContext {
  queryClient: QueryClient;
  session: SessionClient;
  api: ApiClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  notFoundComponent: NotFoundPage,
  errorComponent: ({ error }) => <ErrorScreen error={error} />,
});

// El `redirect` llega de la URL: si no es texto, se ignora. Que sea interno lo decide
// `safeRedirect` al usarlo.
const loginSearch = z.object({ redirect: z.string().optional().catch(undefined) });

/**
 * Las dos pantallas públicas (F1-10). Con sesión no hay nada que hacer acá: se va a donde
 * el usuario iba. `beforeLoad` corre otra vez cuando `refreshSession` invalida el router,
 * así que entrar o registrarse redirige solo.
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

/** Entrar o crear la cuenta, y que el router haga el resto cuando la sesión ya existe. */
function useEnter<TInput>(enter: (input: TInput) => Promise<void>) {
  const router = useRouter();
  // Del router y no de la ruta: el mismo hook sirve en login y en registro.
  const { queryClient } = router.options.context;

  return useMutation({
    mutationFn: enter,
    onSuccess: () => refreshSession({ queryClient, router }),
  });
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search) => loginSearch.parse(search),
  beforeLoad: beforeLoadPublic(),
  component: function LoginRoute() {
    const { session } = loginRoute.useRouteContext();
    const search = loginRoute.useSearch();
    const signIn = useEnter<SignIn>((credentials) => session.signIn(credentials));

    return (
      <LoginPage
        search={search}
        pending={signIn.isPending}
        error={signIn.error}
        onSubmit={(credentials) => {
          signIn.mutate(credentials);
        }}
      />
    );
  },
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/registro',
  validateSearch: (search) => loginSearch.parse(search),
  beforeLoad: beforeLoadPublic(),
  component: function RegisterRoute() {
    const { session } = registerRoute.useRouteContext();
    const search = registerRoute.useSearch();
    const signUp = useEnter<SignUpRequest>((input) => session.signUp(input));

    return (
      <RegisterPage
        search={search}
        pending={signUp.isPending}
        error={signUp.error}
        onSubmit={(input) => {
          signUp.mutate(input);
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
    const { queryClient, session, api } = appRoute.useRouteContext();
    const navigate = useNavigate();
    const { theme, change } = useSyncedTheme(api);
    const signOut = useMutation({
      mutationFn: () => session.signOut(),
      onSuccess: async () => {
        queryClient.setQueryData(SESSION_QUERY_KEY, null);
        await navigate({ to: '/login', search: {} });
      },
    });

    return (
      <AppShell
        theme={theme}
        onThemeChange={change}
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

/* Las dos pantallas de ejercicios llegan con F1-12 y F1-13; la lista ya lleva a ellas. */
const newExerciseRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/ejercicios/nuevo',
  component: function NewExerciseRoute() {
    const { api, queryClient } = appRoute.useRouteContext();
    const navigate = useNavigate();
    const catalog = useQuery(catalogQueryOptions(api));
    const add = useMutation({
      mutationFn: (input: AddExercise) => api.addExercise(input),
      onSuccess: async () => {
        // La lista de Home quedó vieja: que se vuelva a pedir.
        await queryClient.invalidateQueries({ queryKey: EXERCISES_QUERY_KEY });
        await navigate({ to: '/' });
      },
    });

    return (
      <NewExercisePage
        catalog={catalog.data ?? []}
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
    const { api, queryClient } = appRoute.useRouteContext();
    const { id } = exerciseDetailRoute.useParams();
    const { pct } = exerciseDetailRoute.useSearch();
    const navigate = useNavigate();
    const exercises = useQuery(exerciseListQueryOptions(api));
    const preferences = useQuery(preferencesQueryOptions(api));
    const history = useInfiniteQuery(historyQueryOptions(api, id));
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
      },
    });

    return (
      <ExerciseDetailPage
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

    const refreshList = () => queryClient.invalidateQueries({ queryKey: EXERCISES_QUERY_KEY });

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
    const { api, queryClient } = appRoute.useRouteContext();
    const preferences = useQuery(preferencesQueryOptions(api));
    const { theme, change } = useSyncedTheme(api);
    const savePercentages = useMutation({
      mutationFn: (loadPercentages: number[]) => api.savePreferences({ loadPercentages }),
      onSuccess: (saved) => {
        queryClient.setQueryData(PREFERENCES_QUERY_KEY, saved);
      },
    });

    return (
      <ProfilePage
        preferences={preferences}
        theme={theme}
        onThemeChange={change}
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

/*
 * Cuál está abierto vive en la URL (mockup 10): un link a `?abierto=mex_...` abre esa
 * evolución, y es lo que usa el botón del detalle. Un ID inventado no rompe la pantalla:
 * simplemente no coincide con ninguna fila.
 */
const statsSearch = z.object({ abierto: z.string().optional().catch(undefined) });

const statsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/estadisticas',
  validateSearch: (search) => statsSearch.parse(search),
  component: function StatsRoute() {
    const { api } = appRoute.useRouteContext();
    const { abierto } = statsRoute.useSearch();
    const navigate = useNavigate();
    const exercises = useQuery(exerciseListQueryOptions(api));

    // Sólo la del que está abierto: en una lista de diez, nueve consultas no las mira nadie.
    const stats = useQuery({
      ...exerciseStatsQueryOptions(api, abierto ?? '', '12m'),
      enabled: abierto !== undefined,
    });

    return (
      <StatsPage
        exercises={exercises}
        open={abierto}
        stats={abierto === undefined ? null : stats}
        onToggle={(id) => {
          void navigate({
            to: '.',
            search: id === abierto ? {} : { abierto: id },
            replace: true,
          });
        }}
      />
    );
  },
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  appRoute.addChildren([
    homeRoute,
    newExerciseRoute,
    exerciseDetailRoute,
    editExerciseRoute,
    statsRoute,
    profileRoute,
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
