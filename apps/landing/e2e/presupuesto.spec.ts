import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import {
  ANCHOS,
  cargarTodo,
  evaluarPresupuesto,
  kb,
  registrarPeso,
  resumirPeso,
} from './ayudas.ts';
import { DIST_CON_APP, DIST_SIN_APP } from './entorno.ts';
import { PRESUPUESTO } from './presupuesto.ts';

/*
 * El presupuesto de la landing (F10-10, spec §5.7 y §13): no lleva JavaScript, y lo que pesa tiene
 * un tope medido. Sobre el build que sirve el servidor de producción.
 */

async function archivosDe(dir: string): Promise<string[]> {
  const entradas = await readdir(dir, { withFileTypes: true, recursive: true });
  return entradas.filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name));
}

for (const [nombre, dist] of [
  ['con app', DIST_CON_APP],
  ['sin app', DIST_SIN_APP],
] as const) {
  test.describe(`el build ${nombre}`, () => {
    test('dist/ no trae ningún .js', async () => {
      const archivos = await archivosDe(dist);
      expect(archivos.length).toBeGreaterThan(10);
      expect(archivos.filter((a) => /\.(?:[cm]?js|jsx|ts|tsx)$/.test(a))).toEqual([]);
    });

    test('ninguna página trae un <script>', async () => {
      const paginas = (await archivosDe(dist)).filter((a) => a.endsWith('.html'));
      expect(paginas.length).toBeGreaterThanOrEqual(4);
      for (const pagina of paginas) {
        expect(await readFile(pagina, 'utf8'), pagina).not.toMatch(/<script\b/i);
      }
    });
  });
}

for (const ancho of ANCHOS) {
  test(`el peso de la página a ${ancho.nombre}px entra en el presupuesto`, async ({ page }) => {
    await page.setViewportSize({ width: ancho.width, height: ancho.height });
    const medir = registrarPeso(page);

    await page.goto('/', { waitUntil: 'load' });
    await page.waitForLoadState('networkidle');
    const primeraVista = await medir();

    await cargarTodo(page);
    const paginaEntera = await medir();

    // Siempre queda en el reporte: es el número con que se vuelve a fijar el presupuesto.
    const lineaDePeso =
      `primera vista ${kb(primeraVista.total)} (${resumirPeso(primeraVista)}) · ` +
      `página entera ${kb(paginaEntera.total)} (${resumirPeso(paginaEntera)})`;
    test.info().annotations.push({ type: `peso a ${ancho.nombre}px`, description: lineaDePeso });
    console.log(`peso a ${ancho.nombre}px: ${lineaDePeso}`);

    const fallas = evaluarPresupuesto(
      { primeraVista: primeraVista.total, paginaEntera: paginaEntera.total },
      PRESUPUESTO[ancho.nombre],
    );
    expect(fallas, `Presupuesto de peso a ${ancho.nombre}px. Medido: ${lineaDePeso}`).toEqual([]);
  });
}
