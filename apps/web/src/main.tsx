import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/space-grotesk';
import '@wasabi-cross/ui/styles.css';
import { App } from './app/App.tsx';
import { createApiClient } from './app/api.ts';
import { createApp } from './app/create-app.ts';
import { createSessionClient } from './app/session.ts';
import { createHttpClient } from './lib/http.ts';

const container = document.getElementById('root');

if (!container) {
  throw new Error('No existe #root en index.html');
}

const http = createHttpClient({ baseUrl: import.meta.env.VITE_API_URL ?? '' });
const session = createSessionClient(http);
const { queryClient, router } = createApp({ session, api: createApiClient(http) });

createRoot(container).render(
  <StrictMode>
    <App queryClient={queryClient} router={router} session={session} />
  </StrictMode>,
);
