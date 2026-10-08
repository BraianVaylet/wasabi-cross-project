import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { marca, seo, titular } from '../src/content/sitio.ts';

/*
 * Arma `public/og.png`, la imagen de 1200×630 que se ve al compartir el enlace (F10-04): la marca,
 * el titular y la pantalla de inicio de la app. Se corre a mano cuando cambia el titular, la marca
 * o la captura (`pnpm --filter @wasabi-cross/landing og`) y el PNG se commitea; no es parte del
 * build.
 *
 * Los colores salen de los mismos tokens que la página (los de la app y los de la landing) y las
 * fuentes, de Fontsource: nada escrito a mano acá.
 */

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const ANCHO = 1200;
const ALTO = 630;

const leer = (ruta: string): Promise<string> => readFile(join(RAIZ, ruta), 'utf8');
const fuente = (paquete: string, archivo: string): string =>
  pathToFileURL(join(RAIZ, 'node_modules', '@fontsource', paquete, 'files', archivo)).href;

const tokens = [
  await leer('../../packages/ui/src/styles/tokens.css'),
  await leer('src/styles/tokens.css'),
].join('\n');
const captura = pathToFileURL(join(RAIZ, 'src', 'assets', 'capturas', '01-home.png')).href;

const html = `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<style>
${tokens}
@font-face { font-family: 'Staatliches'; font-weight: 400; src: url(${fuente('staatliches', 'staatliches-latin-400-normal.woff2')}) format('woff2'); }
@font-face { font-family: 'Share Tech Mono'; font-weight: 400; src: url(${fuente('share-tech-mono', 'share-tech-mono-latin-400-normal.woff2')}) format('woff2'); }
* { box-sizing: border-box; }
body { position: relative; width: ${String(ANCHO)}px; height: ${String(ALTO)}px; margin: 0; overflow: hidden; background: var(--wc-bg); color: var(--wc-text); }
.izquierda { position: absolute; top: 56px; left: 72px; width: 640px; }
.marca { display: flex; align-items: center; gap: 20px; }
.logo { display: grid; place-items: center; width: 76px; height: 76px; background: var(--wc-accent); color: var(--wc-text-on-accent); font: 400 62px/1 var(--wc-font-family-display); }
.nombre { font: 400 46px/1 var(--wc-font-family-display); letter-spacing: 0.09em; text-transform: uppercase; }
.nombre i { color: var(--wc-accent); font-style: normal; }
.lema { margin-top: 8px; color: var(--wc-text-muted); font: 400 19px/1 var(--wc-font-family); letter-spacing: 0.2em; text-transform: uppercase; }
h1 { margin: 52px 0 0; font: 400 78px/0.94 var(--wc-font-family-display); letter-spacing: 0.035em; text-transform: uppercase; }
h1 span { display: block; margin-top: 12px; color: var(--wc-accent); }
.captura { position: absolute; top: 56px; right: 72px; width: 360px; border: 2px solid var(--wc-line); background: var(--wc-surface); }
.captura img { display: block; width: 100%; }
</style>
</head>
<body class="wc-root">
  <div class="izquierda">
    <div class="marca">
      <div class="logo">W</div>
      <div>
        <div class="nombre">Wasabi <i>//</i> Cross</div>
        <div class="lema">${marca.lema}</div>
      </div>
    </div>
    <h1>${titular.primeraLinea}<span>${titular.acento}</span></h1>
  </div>
  <div class="captura"><img src="${captura}" alt=""></div>
</body>
</html>`;

const temporal = await mkdtemp(join(tmpdir(), 'wasabi-og-'));
const pagina = join(temporal, 'og.html');
await writeFile(pagina, html);

const navegador = await chromium.launch();
try {
  const contexto = await navegador.newContext({ viewport: { width: ANCHO, height: ALTO } });
  const p = await contexto.newPage();
  await p.goto(pathToFileURL(pagina).href);
  await p.evaluate(() => document.fonts.ready);
  const bruto = await p.screenshot({ type: 'png' });
  // Una paleta de 256 colores alcanza para una interfaz oscura con una captura, y la deja en una
  // fracción del peso: algunas apps descartan las imágenes pesadas al compartir.
  const png = await sharp(bruto).png({ palette: true, quality: 95, effort: 10 }).toBuffer();
  await writeFile(join(RAIZ, 'public', 'og.png'), png);
  console.log(
    `${seo.imagen.ruta}: ${String(ANCHO)}×${String(ALTO)}, ${(png.byteLength / 1024).toFixed(0)} KB`,
  );
} finally {
  await navegador.close();
  await rm(temporal, { recursive: true, force: true });
}
