import { fileURLToPath } from 'node:url';

/*
 * Dónde está cada cosa del E2E de la landing (F10-10): los dos builds, sus puertos y las variables
 * con que se compilan. Lo leen la config de Playwright (que levanta los servidores) y los specs (que
 * miran los archivos del build).
 *
 * Dos builds porque `PUBLIC_APP_URL` la inlinea Astro al compilar: con y sin app son dos sitios
 * distintos (spec §5.7), y los dos tienen que estar bien.
 */

/** Los builds del E2E: fuera de `dist/`, para no pisar el que usa `pnpm start`. */
export const DIST_CON_APP = fileURLToPath(new URL('../dist-e2e/con-app', import.meta.url));
export const DIST_SIN_APP = fileURLToPath(new URL('../dist-e2e/sin-app', import.meta.url));

/** Puertos propios, para no pelearse con un `pnpm dev` (4321) ni con el `start` (3000). */
export const PUERTO_CON_APP = 4311;
export const PUERTO_SIN_APP = 4312;
export const URL_CON_APP = `http://127.0.0.1:${String(PUERTO_CON_APP)}`;
export const URL_SIN_APP = `http://127.0.0.1:${String(PUERTO_SIN_APP)}`;

/** A donde llevan "Entrar" y "Empezar gratis" en el build con app. Nunca se navega: sólo se mira. */
export const APP_URL = 'https://app.ejemplo.test';

/** Quién responde en las páginas legales del build con app (spec §5.7). */
export const CONTACTO = { nombre: 'Titular de Prueba', email: 'contacto@ejemplo.test' } as const;
