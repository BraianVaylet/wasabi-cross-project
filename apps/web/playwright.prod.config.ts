import { crearConfig } from './playwright.config.ts';

/** El E2E contra el build de producción servido por la API (F3-05, ADR-0007). */
export default crearConfig('prod');
