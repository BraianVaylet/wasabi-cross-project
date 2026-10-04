import { startServer } from './bootstrap.ts';

/*
 * La entrada de producción (`node dist/server.js`). No recibe nada de afuera: el IdP falso de
 * desarrollo entra sólo por `scripts/dev.ts` y `scripts/ephemeral.ts`.
 */
startServer().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
