import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { ESCALAS, svgDeLaMarca } from '../../../packages/ui/src/components/logo/marca.ts';

/*
 * Genera los archivos del logo en `apps/web/public`: el SVG, los PNG de la PWA y el apple-touch,
 * y el favicon.ico. La marca se define una sola vez, en `marca.ts` de `@wasabi-cross/ui`; esto
 * sólo la dibuja en cada tamaño. Se corre a mano cuando cambia el logo:
 *
 *   pnpm --filter @wasabi-cross/web icons
 *
 * Los PNG los rasteriza el Chromium de Playwright (el mismo del E2E), así que hace falta
 * tenerlo instalado. Los resultados se versionan: el build no depende de este script.
 */

const PUBLIC = new URL('../public/', import.meta.url);

/** "any": con esquinas redondeadas y la marca grande. Es el SVG, el favicon y el ícono de la PWA. */
const redondeado = svgDeLaMarca({ esquinas: true, escala: ESCALAS.icono });
/** A sangre y con la marca en la zona segura: el sistema le pone su propia máscara (Android, iOS). */
const aSangre = svgDeLaMarca({ esquinas: false, escala: ESCALAS.segura });

const navegador = await chromium.launch();

async function rasterizar(svg: string, lado: number): Promise<Buffer> {
  const pagina = await navegador.newPage({ viewport: { width: lado, height: lado } });
  await pagina.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${String(lado)}px;height:${String(lado)}px}</style>${svg}`,
  );
  // Sin fondo propio: las esquinas del redondeado quedan transparentes.
  const png = await pagina.screenshot({ type: 'png', omitBackground: true });
  await pagina.close();
  return png;
}

/**
 * Un `.ico` con los PNG adentro (válido desde Windows Vista y en todos los navegadores): un
 * encabezado de 6 bytes, una entrada de 16 por imagen y después los PNG tal cual.
 */
function armarIco(imagenes: { lado: number; png: Buffer }[]): Buffer {
  const encabezado = Buffer.alloc(6);
  encabezado.writeUInt16LE(1, 2); // tipo: 1 = ícono
  encabezado.writeUInt16LE(imagenes.length, 4);

  let desplazamiento = encabezado.length + 16 * imagenes.length;
  const entradas = imagenes.map(({ lado, png }) => {
    const entrada = Buffer.alloc(16);
    entrada.writeUInt8(lado, 0); // ancho
    entrada.writeUInt8(lado, 1); // alto
    entrada.writeUInt16LE(1, 4); // planos
    entrada.writeUInt16LE(32, 6); // bits por píxel
    entrada.writeUInt32LE(png.length, 8);
    entrada.writeUInt32LE(desplazamiento, 12);
    desplazamiento += png.length;
    return entrada;
  });

  return Buffer.concat([encabezado, ...entradas, ...imagenes.map(({ png }) => png)]);
}

async function escribir(ruta: string, contenido: string | Buffer): Promise<void> {
  await writeFile(new URL(ruta, PUBLIC), contenido);
  console.log(`  public/${ruta}`);
}

try {
  await mkdir(new URL('icons/', PUBLIC), { recursive: true });
  console.log('Logo →');

  await escribir('logo.svg', redondeado);

  const favicon = await Promise.all(
    [16, 32, 48].map(async (lado) => ({ lado, png: await rasterizar(redondeado, lado) })),
  );
  await escribir('favicon.ico', armarIco(favicon));

  await escribir('icons/icon-192.png', await rasterizar(redondeado, 192));
  await escribir('icons/icon-512.png', await rasterizar(redondeado, 512));
  await escribir('icons/icon-maskable-512.png', await rasterizar(aSangre, 512));
  await escribir('apple-touch-icon.png', await rasterizar(aSangre, 180));
} finally {
  await navegador.close();
}
