import { expect, test } from '@playwright/test';
import {
  ANCHOS,
  anclasColgando,
  auditar,
  cargarTodo,
  esSubsecuencia,
  hayScrollHorizontal,
  imagenesRotas,
  describirRotas,
  recorrerConTab,
  vigilar,
} from './ayudas.ts';

/*
 * El E2E de la landing sin app (F10-10, spec §5.7): el build que sale mientras `PUBLIC_APP_URL` no
 * esté, que es lo que hay hasta que la app esté en producción. "Entrar" y "Empezar gratis" no se
 * muestran, y no queda ningún enlace al ingreso. Lo demás tiene que estar igual de bien.
 */

for (const ancho of ANCHOS) {
  test.describe(`a ${ancho.nombre}px`, () => {
    test.use({ viewport: { width: ancho.width, height: ancho.height } });

    test('no hay "Entrar" ni "Empezar gratis", ni ningún enlace al /login', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('link', { name: /Entrar|Empezar gratis/ })).toHaveCount(0);
      const hrefs = await page
        .locator('a[href]')
        .evaluateAll((enlaces) => enlaces.map((a) => a.getAttribute('href') ?? ''));
      expect(hrefs.filter((h) => h.includes('/login'))).toEqual([]);
      // Lo que sí queda: "Ver la app en acción", que lleva a la captura del hero.
      await expect(page.getByRole('link', { name: /Ver la app en acción/ }).first()).toBeVisible();
    });

    test('la página sin app: sin violaciones, sin consola, sin scroll y sin imágenes rotas', async ({
      page,
    }) => {
      const problemas = vigilar(page);
      await page.goto('/');
      await cargarTodo(page);

      await auditar(page, `inicio sin app a ${ancho.nombre}px`);
      expect(problemas()).toEqual([]);
      expect(await hayScrollHorizontal(page)).toBe(false);
      expect(await anclasColgando(page)).toEqual([]);
      const rotas = await imagenesRotas(page);
      expect(rotas, `Imágenes rotas:\n${describirRotas(rotas)}`).toEqual([]);
    });

    test('las páginas legales avisan que falta el contacto, y no inventan uno', async ({
      page,
    }) => {
      for (const ruta of ['/privacidad/', '/terminos/']) {
        await page.goto(ruta);
        const main = page.getByRole('main');
        await expect(main).toContainText('antes de publicar el sitio');
        await expect(main.locator('a[href^="mailto:"]')).toHaveCount(0);
        await auditar(page, `${ruta} sin contacto a ${ancho.nombre}px`);
      }
    });

    test('el foco recorre la página y siempre se ve, empezando por el enlace de salto', async ({
      page,
    }) => {
      await page.goto('/');
      const paradas = await recorrerConTab(page);
      expect(paradas[0]?.nombre).toBe('Saltar al contenido');

      const sinFoco = paradas.filter((p) => p.foco === 'ninguno' || !p.visible);
      expect(
        sinFoco,
        `Sin foco visible: ${sinFoco.map((p) => `${p.tag} "${p.nombre}"`).join(', ')}`,
      ).toEqual([]);

      const nombres = paradas.map((p) => (p.rol === 'region' ? '<tabla>' : p.nombre));
      const esperado = [
        'Saltar al contenido',
        ...(ancho.width >= 768 ? ['Registro', 'Funciones', 'Free / PRO'] : []),
        'Ver la app en acción',
        '<tabla>',
        'Privacidad',
        'Términos',
      ];
      expect(
        esSubsecuencia(esperado, nombres),
        `Orden del foco inesperado.\nEsperado (en ese orden): ${esperado.join(' → ')}\nReal: ${nombres.join(' → ')}`,
      ).toBe(true);
    });
  });
}
