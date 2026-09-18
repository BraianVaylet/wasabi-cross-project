import { useMutation, type QueryClient } from '@tanstack/react-query';
import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
  useNavigate,
  type RouterHistory,
} from '@tanstack/react-router';
import { z } from 'zod';
import { HomePage } from '../pages/HomePage.tsx';
import { LoginPage } from '../pages/LoginPage.tsx';
import { NotFoundPage } from '../pages/NotFoundPage.tsx';
import { ProfilePage } from '../pages/ProfilePage.tsx';
import { ErrorScreen } from './ErrorNotice.tsx';
import { safeRedirect } from './redirect.ts';
import { SESSION_QUERY_KEY, sessionQueryOptions, type SessionClient } from './session.ts';
import { AppShell } from './shell/AppShell.tsx';

export interface RouterContext {
  queryClient: QueryClient;
  session: SessionClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  notFoundComponent: NotFoundPage,
  errorComponent: ({ error }) => <ErrorScreen error={error} />,
});

// El `redirect` llega de la URL: si no es texto, se ignora. Que sea interno lo decide
// `safeRedirect` al usarlo.
const loginSearch = z.object({ redirect: z.string().optional().catch(undefined) });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search) => loginSearch.parse(search),
  beforeLoad: async ({ context, search }) => {
    const user = await context.queryClient.query(sessionQueryOptions(context.session));
    if (user) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- así redirige TanStack Router
      throw redirect({ href: safeRedirect(search.redirect) });
    }
  },
  component: LoginPage,
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
    const { user } = appRoute.useRouteContext();
    return <HomePage user={user} />;
  },
});

const profileRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/perfil',
  component: ProfilePage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([homeRoute, profileRoute]),
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
