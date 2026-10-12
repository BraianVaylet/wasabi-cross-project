import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lineaDeAcceso, puertoDeAstro } from '../src/lib/dev.ts';

/*
 * La landing para desarrollar (`pnpm dev` de la raíz, o `pnpm --filter @wasabi-cross/landing dev`):
 * es `astro dev` más una línea de acceso rápido con la URL real, como la que Vite imprime para la
 * web. Los argumentos pasan tal cual a `astro dev` (`--host`, `--port`…).
 *
 * Astro cambia el formato de lo que escribe según dónde corre (JSON si detecta un agente), y toma
 * otro puerto si el 4321 está ocupado: la línea sale de lo que Astro dijo, no de un número fijo.
 */

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const ASTRO = fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url));

const astro = spawn(process.execPath, [ASTRO, 'dev', ...process.argv.slice(2)], {
  cwd: RAIZ,
  // La salida de Astro pasa por acá para leerle el puerto; la entrada y los errores, directos.
  stdio: ['inherit', 'pipe', 'inherit'],
  // Con un pipe en el medio, Astro creería que no hay terminal y apagaría los colores.
  env: process.stdout.isTTY ? { ...process.env, FORCE_COLOR: '1' } : process.env,
});

let anunciado = false;
let recibido = '';

astro.stdout.on('data', (trozo: Buffer) => {
  process.stdout.write(trozo);
  if (anunciado) return;

  // Una URL puede venir cortada entre dos trozos: se junta, acotado.
  recibido = (recibido + trozo.toString('utf8')).slice(-2000);
  const puerto = puertoDeAstro(recibido);
  if (puerto === null) return;

  anunciado = true;
  console.log(`\n${lineaDeAcceso('Landing', puerto)}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    astro.kill(signal);
  });
}

astro.on('exit', (code, signal) => {
  process.exit(code ?? (signal === null ? 0 : 1));
});
