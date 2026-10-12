import { expect, test, type Page } from '@playwright/test';
import {
  BOTON_DESARROLLO,
  BOTON_MICROSOFT,
  apiUrl,
  atletaNuevo,
  auditar,
  cerrarSesion,
  elegirEnElIdp,
  pedirMe,
  registrarse,
} from './app.ts';

/*
 * El ingreso con OAuth 2.0, de punta a punta (F9-09, spec §5.6, ADR-0012): el botón de `/login`, la
 * pantalla del proveedor —el IdP falso de desarrollo, por sus dos caras: la genérica y la de
 * Microsoft—, el callback de la API, la cookie y Home. Corre en `pnpm e2e` y en `pnpm e2e:prod`; en el
 * segundo, con el service worker activo y la CSP de producción.
 *
 * Los pedidos directos a la API (`/me`, `/stats/summary`, `/me/photo`) van por `page.request`, que
 * comparte las cookies de la página: lo que se mira es lo que vería esa sesión.
 */

// 390px: el ancho del diseño (spec §11) y el de la auditoría de accesibilidad.
test.use({ viewport: { width: 390, height: 1300 } });

/** Los tres avisos con los que `/login` dice por qué no se entró (spec §5.6). */
const AVISO = {
  cancelado: {
    codigo: 'WC-OAUTH-400-001',
    mensaje: 'Cancelaste el ingreso. Probá de nuevo cuando quieras.',
  },
  fallido: {
    codigo: 'WC-OAUTH-400-002',
    mensaje: 'No pudimos completar el ingreso. Probá de nuevo.',
  },
  sinVincular: {
    codigo: 'WC-OAUTH-409-003',
    mensaje: 'Ya hay una cuenta con ese email. Entrá con el otro proveedor.',
  },
} as const;

/** El aviso a la vista, con el mensaje del catálogo; y el `?error=` ya fuera de la URL. */
async function esperarAviso(page: Page, aviso: (typeof AVISO)[keyof typeof AVISO]): Promise<void> {
  const alerta = page.getByRole('alert');
  await expect(alerta).toContainText(aviso.mensaje);
  await expect(alerta).toContainText(aviso.codigo);
  await expect(page).toHaveURL(/\/login$/);
}

/** No hay sesión: la API no sabe quién es. */
async function esperarSinSesion(page: Page): Promise<void> {
  const me = await pedirMe(page);
  expect(me.status()).toBe(401);
  expect(await me.json()).toMatchObject({ errorCode: 'WC-AUTH-401-004' });
}

test.describe('entrar y volver a entrar', () => {
  test('un usuario nuevo llega a Home con plan Free, y la API le niega las estadísticas', async ({
    page,
  }) => {
    const atleta = await registrarse(page);

    const me = await pedirMe(page);
    expect(me.status()).toBe(200);
    expect(await me.json()).toMatchObject({
      email: atleta.email,
      name: atleta.nombre,
      plan: 'free',
      hasPhoto: false,
    });

    // Cualquier cuenta verificada nace Free: la regla es de la API, no de la pantalla (spec §4).
    const resumen = await page.request.get(`${apiUrl()}/api/v1/stats/summary`);
    expect(resumen.status()).toBe(403);
    expect(await resumen.json()).toMatchObject({ errorCode: 'WC-SUBS-403-002' });
  });

  test('al cerrar sesión y volver a entrar es el mismo usuario, y el proveedor vuelve a pedir la cuenta', async ({
    page,
  }) => {
    const atleta = await registrarse(page);
    const primero = (await (await pedirMe(page)).json()) as { id: string };

    await cerrarSesion(page);
    await esperarSinSesion(page);

    await page.getByRole('button', { name: BOTON_DESARROLLO }).click();
    // El proveedor no se acuerda de nadie: la pantalla de elegir la cuenta vuelve a aparecer.
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    await elegirEnElIdp(page, { email: atleta.email, nombre: atleta.nombre });

    await expect(page.getByRole('heading', { name: 'Tus ejercicios' })).toBeVisible();
    const segundo = (await (await pedirMe(page)).json()) as { id: string };
    expect(segundo.id).toBe(primero.id);
  });

  test('cada ingreso le pide al proveedor que haga elegir la cuenta, con los scopes mínimos y PKCE', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: BOTON_MICROSOFT }).click();
    await page.waitForURL(/:3102\/consumers\/oauth2\/v2\.0\/authorize/);

    const pedido = new URL(page.url()).searchParams;
    // Cerrar sesión en Wasabi Cross no cierra la del proveedor: sin esto, en un teléfono
    // compartido se entraría solo a la cuenta equivocada.
    expect(pedido.get('prompt')).toBe('select_account');
    // Sólo cuentas personales, `User.Read` para la foto y sin acceso offline.
    expect(pedido.get('scope')).toContain('User.Read');
    expect(pedido.get('scope')).not.toContain('offline_access');
    expect(pedido.get('code_challenge_method')).toBe('S256');
    expect(pedido.get('state')).toBeTruthy();
  });

  test('con Microsoft, una cuenta personal entra', async ({ page }) => {
    const atleta = atletaNuevo();

    await page.goto('/login');
    await page.getByRole('button', { name: BOTON_MICROSOFT }).click();
    await elegirEnElIdp(page, { email: atleta.email, nombre: atleta.nombre });

    await expect(page.getByRole('heading', { name: 'Tus ejercicios' })).toBeVisible();
    const me = await pedirMe(page);
    expect(await me.json()).toMatchObject({ email: atleta.email, plan: 'free' });
  });
});

test.describe('la foto en el Perfil', () => {
  test('con foto, el Perfil la muestra, cargada desde la API y con la CSP de siempre', async ({
    page,
  }) => {
    const atleta = await registrarse(page, { conFoto: true });

    // La API la sirve desde su origen, con revalidación y sin dejar ver de quién es en la URL.
    const foto = await page.request.get(`${apiUrl()}/api/v1/me/photo`);
    expect(foto.status()).toBe(200);
    expect(foto.headers()['content-type']).toBe('image/png');
    expect(foto.headers()['cache-control']).toBe('private, no-cache');
    expect(foto.headers().etag).toBeTruthy();
    expect(await (await pedirMe(page)).json()).toMatchObject({ hasPhoto: true });

    // El navegador la pide a la ruta de la API que no lleva id.
    const pedida = page.waitForRequest((pedido) => pedido.url().endsWith('/api/v1/me/photo'));
    await page.goto('/perfil');
    await pedida;
    const cuenta = page.getByRole('region', { name: 'Tu cuenta' });
    await expect(cuenta.getByText(atleta.nombre)).toBeVisible();
    await expect(cuenta.getByText(atleta.email)).toBeVisible();

    if (test.info().config.metadata.target === 'prod') {
      // Cargó de verdad: el IdP manda un PNG de 1×1, y el navegador lo decodificó, con la CSP de
      // producción (`img-src 'self' data:`) y la foto saliendo del mismo origen.
      const imagen = cuenta.locator('img');
      await expect(imagen).toHaveAttribute('src', /\/api\/v1\/me\/photo$/);
      await expect(imagen).toHaveJSProperty('naturalWidth', 1);
    } else {
      // En desarrollo el front (Vite) y la API están en puertos distintos, y Chrome rechaza la
      // imagen con `ERR_BLOCKED_BY_RESPONSE.NotSameSite`: el `Cross-Origin-Resource-Policy:
      // same-site` de la ruta no la deja pasar entre dos orígenes aunque sean del mismo sitio, y el
      // Perfil cae a las iniciales. Sólo pasa en desarrollo; en producción es el mismo origen. Está
      // anotado en STATE.md como decisión abierta: acá no se afirma que cargue.
      test.info().annotations.push({
        type: 'limitación de desarrollo',
        description: 'la foto no carga entre orígenes distintos (CORP same-site); ver STATE.md',
      });
    }

    await auditar(page, 'Perfil con foto');
  });

  test('sin foto, el Perfil muestra las iniciales', async ({ page }) => {
    const atleta = await registrarse(page);

    const foto = await page.request.get(`${apiUrl()}/api/v1/me/photo`);
    expect(foto.status()).toBe(404);
    expect(await foto.json()).toMatchObject({ errorCode: 'WC-USER-404-001' });

    await page.goto('/perfil');
    const cuenta = page.getByRole('region', { name: 'Tu cuenta' });
    await expect(cuenta.getByText(atleta.nombre)).toBeVisible();
    await expect(cuenta.getByText('B', { exact: true })).toBeVisible();
    await expect(cuenta.locator('img')).toHaveCount(0);

    await auditar(page, 'Perfil con iniciales');
  });
});

test.describe('cuando el ingreso no sale', () => {
  test('cancelar en el proveedor vuelve a /login con el aviso y sin sesión', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: BOTON_DESARROLLO }).click();
    await elegirEnElIdp(page, { email: atletaNuevo().email, cancelar: true });

    await esperarAviso(page, AVISO.cancelado);
    await esperarSinSesion(page);
    // Se puede volver a intentar.
    await expect(page.getByRole('button', { name: BOTON_DESARROLLO })).toBeEnabled();
    await auditar(page, 'Entrar con el aviso de cancelación');
  });

  test('un state alterado no entra: aviso genérico y sin sesión', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: BOTON_DESARROLLO }).click();
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();

    // Lo que haría quien intenta colar un callback ajeno: el `state` que vuelve no es el que salió.
    await page.locator('input[name="state"]').evaluate((campo: HTMLInputElement) => {
      campo.value = 'estado-alterado';
    });
    await elegirEnElIdp(page, { email: atletaNuevo().email });

    await esperarAviso(page, AVISO.fallido);
    await esperarSinSesion(page);
  });

  test('con Microsoft, una cuenta de trabajo o escuela no entra', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: BOTON_MICROSOFT }).click();
    // El email de una cuenta de organización lo controla el administrador del tenant: no es una
    // identidad (spec §5.6). La API lo rechaza por el `tid`, aunque el token sea válido.
    await elegirEnElIdp(page, { email: atletaNuevo().email, organizacion: true });

    await esperarAviso(page, AVISO.fallido);
    await esperarSinSesion(page);
  });

  test('un email que ya tiene cuenta con el otro proveedor no entra a esa cuenta, y la original queda intacta', async ({
    page,
  }) => {
    const atleta = await registrarse(page);
    const original = (await (await pedirMe(page)).json()) as { id: string };
    await cerrarSesion(page);

    // El mismo email, por el otro proveedor: las cuentas no se vinculan solas.
    await page.getByRole('button', { name: BOTON_MICROSOFT }).click();
    await elegirEnElIdp(page, { email: atleta.email, nombre: atleta.nombre });

    await esperarAviso(page, AVISO.sinVincular);
    await esperarSinSesion(page);

    // Y con el proveedor de siempre sigue entrando a la misma cuenta.
    await page.getByRole('button', { name: BOTON_DESARROLLO }).click();
    await elegirEnElIdp(page, { email: atleta.email, nombre: atleta.nombre });
    await expect(page.getByRole('heading', { name: 'Tus ejercicios' })).toBeVisible();
    const otraVez = (await (await pedirMe(page)).json()) as { id: string };
    expect(otraVez.id).toBe(original.id);
  });
});

test.describe('ya no hay email ni contraseña', () => {
  test('/registro no existe, y el alta y el ingreso por email responden 404', async ({ page }) => {
    await page.goto('/registro');
    await expect(page.getByText('No encontramos lo que buscás.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Crear una cuenta' })).toHaveCount(0);

    const credenciales = {
      email: atletaNuevo().email,
      name: 'Braian',
      password: 'una-frase-larga-y-propia',
    };
    for (const ruta of ['/api/auth/sign-up/email', '/api/auth/sign-in/email']) {
      const respuesta = await page.request.post(`${apiUrl()}${ruta}`, { data: credenciales });
      expect(respuesta.status(), ruta).toBe(404);
      expect(await respuesta.json(), ruta).toMatchObject({ errorCode: 'WC-SYS-404-003' });
    }
  });

  test('/login no tiene campos: sólo los botones de los proveedores', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('button', { name: BOTON_MICROSOFT })).toBeVisible();
    await expect(page.getByRole('button', { name: BOTON_DESARROLLO })).toBeVisible();
    await expect(page.locator('input')).toHaveCount(0);
  });
});

test.describe('accesibilidad a 390px', () => {
  test('/login', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: BOTON_MICROSOFT })).toBeVisible();
    await expect(page.getByRole('button', { name: BOTON_DESARROLLO })).toBeVisible();

    await auditar(page, 'Entrar');
  });

  test('/login con el aviso de un ingreso que no salió', async ({ page }) => {
    await page.goto('/login?error=account_not_linked');
    await expect(page.getByRole('alert')).toContainText(AVISO.sinVincular.mensaje);

    await auditar(page, 'Entrar con el aviso de cuenta sin vincular');
  });
});
