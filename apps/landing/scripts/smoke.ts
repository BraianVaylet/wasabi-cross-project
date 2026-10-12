import { formatearSmoke, smoke } from '../src/lib/smoke.ts';

/*
 * El smoke de la landing contra una URL (F10-13). Sólo hace GET:
 *
 *   pnpm --filter @wasabi-cross/landing smoke -- https://staging.… --app-url https://app-staging.…
 *   pnpm --filter @wasabi-cross/landing smoke -- https://ejemplo.com --indexable \
 *     --app-url https://app.ejemplo.com --www https://www.ejemplo.com
 *
 *   <url>         la landing a probar (obligatoria)
 *   --indexable   producción: se espera index,follow, canonical, sitemap y contacto legal
 *   --site-url    el origen público que tiene que decir el canonical (por defecto, <url>)
 *   --app-url     a dónde tiene que llevar "Entrar" (sin esto, se espera que no esté)
 *   --www         una URL que tiene que redirigir al sitio
 *
 * Sale con código 1 si algo falla: sirve para cortar un deploy (F3-12).
 */

const USO =
  'Uso: smoke <url> [--indexable] [--site-url <url>] [--app-url <url>] [--www <url>]\n' +
  'Ejemplo: smoke https://staging.ejemplo.com --app-url https://app-staging.ejemplo.com';

const argumentos = process.argv.slice(2).filter((a) => a !== '--');
const banderas = new Set(['--indexable']);
const conValor = new Set(['--site-url', '--app-url', '--www']);

const valores = new Map<string, string>();
let url: string | undefined;
let indexable = false;

for (let i = 0; i < argumentos.length; i++) {
  const argumento = argumentos[i] ?? '';
  if (banderas.has(argumento)) {
    indexable = true;
  } else if (conValor.has(argumento)) {
    const valor = argumentos[++i];
    if (valor === undefined || valor.startsWith('--')) {
      console.error(`${argumento} necesita un valor.\n${USO}`);
      process.exit(2);
    }
    valores.set(argumento, valor);
  } else if (argumento.startsWith('--')) {
    console.error(`No conozco ${argumento}.\n${USO}`);
    process.exit(2);
  } else {
    url = argumento;
  }
}

if (url === undefined) {
  console.error(`Falta la URL de la landing.\n${USO}`);
  process.exit(2);
}

const chequeos = await smoke({
  baseUrl: url,
  indexable,
  siteUrl: valores.get('--site-url'),
  appUrl: valores.get('--app-url'),
  redirigeDesde: valores.get('--www'),
});

console.log(formatearSmoke(chequeos));
process.exit(chequeos.every((c) => c.ok) ? 0 : 1);
