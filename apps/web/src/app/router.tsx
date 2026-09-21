import type { AddExercise, SignIn, SignUpRequest } from '@wasabi-cross/schemas';
import { useMutation, useQuery, type QueryClient } from '@tanstack/react-query';
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
import { ExerciseDetailPage } from '../pages/ExerciseDetailPage.tsx';
import { ProfilePage } from '../pages/ProfilePage.tsx';
import { refreshSession } from './create-app.ts';
import {
  catalogQueryOptions,
  exerciseListQueryOptions,
  EXERCISES_QUERY_KEY,
  type ApiClient,
} from './api.ts';
import { ErrorScreen } from './ErrorNotice.tsx';
import { safeRedirect, type RedirectSearch } from './redirect.ts';
import { SESSION_QUERY_KEY, sessionQueryOptions, type SessionClient } from './session.ts';
import { AppShell } from './shell/AppShell.tsx';

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
    const { queryClient, session } = appRoute.useRouteContext();
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

const exerciseDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/ejercicios/$id',
  component: ExerciseDetailPage,
});

const profileRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/perfil',
  component: ProfilePage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  appRoute.addChildren([homeRoute, newExerciseRoute, exerciseDetailRoute, profileRoute]),
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
