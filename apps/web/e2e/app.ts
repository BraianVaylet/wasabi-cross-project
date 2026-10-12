import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/*
 * Lo que comparten los E2E: un atleta nuevo por test (la base es una sola y no se limpia
 * entre pruebas) y la auditoría de accesibilidad.
 */

export interface Atleta {
  email: string;
  nombre: string;
}

export function atletaNuevo(): Atleta {
  return {
    email: `e2e-${crypto.randomUUID()}@example.com`,
    nombre: 'Braian',
  };
}

/** Los botones de la pantalla de ingreso. En E2E hay dos proveedores: el de desarrollo y Microsoft. */
export const BOTON_DESARROLLO = 'Continuar con Ingreso de desarrollo';
export const BOTON_MICROSOFT = 'Continuar con Microsoft';

/** La API: otro origen en desarrollo (el front lo sirve Vite), el mismo en el build de producción. */
export function apiUrl(): string {
  return String(test.info().config.metadata.apiURL);
}

/** El control del plan que levanta `dev:ephemeral` (apps/api/scripts/ephemeral.ts). */
const CONTROL = 'http://127.0.0.1:3101';

/**
 * Fija el plan de un atleta, directo en la base descartable: todavía no hay forma de pagar (spec
 * §4), así que no hay otra. La API lo lee en el pedido siguiente; la pantalla, al recargar.
 */
export async function fijarPlan(email: string, plan: 'free' | 'pro'): Promise<void> {
  const response = await fetch(`${CONTROL}/plan`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, plan }),
  });

  expect(response.status, `fijar el plan ${plan} de ${email}`).toBe(204);
}

/** Qué se elige en la pantalla del IdP falso. Lo que no se pide queda como lo ofrece la pantalla. */
export interface EleccionDelIdp {
  email: string;
  nombre?: string;
  /** Tilda "Con foto": el IdP manda un `picture` y la API lo guarda como la foto del usuario. */
  conFoto?: boolean;
  /** "Cuenta de Microsoft": una de trabajo o escuela, que la API tiene que rechazar. Sólo en su cara. */
  organizacion?: boolean;
  /** Sin "Entrar": cancela en el proveedor, como quien aprieta "No permitir". */
  cancelar?: boolean;
}

/**
 * La pantalla del IdP falso: elegir quién entra, o cancelar. Es la misma para el proveedor de
 * desarrollo y para la cara de Microsoft. `exact`, porque "Email verificado por el proveedor"
 * también contiene la palabra.
 */
export async function elegirEnElIdp(page: Page, eleccion: EleccionDelIdp): Promise<void> {
  const {
    email,
    nombre = 'Braian',
    conFoto = false,
    organizacion = false,
    cancelar = false,
  } = eleccion;

  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Nombre', { exact: true }).fill(nombre);

  if (conFoto || organizacion) {
    await page.getByText('Más opciones').click();
    if (conFoto) {
      await page.getByLabel('Con foto').check();
    }
    if (organizacion) {
      await page.getByLabel('Cuenta de Microsoft').selectOption('organization');
    }
  }

  await page.getByRole('button', { name: cancelar ? 'Cancelar' : 'Entrar' }).click();
}

/**
 * Entra por el IdP falso de desarrollo (F9-05, ADR-0012) con un atleta nuevo: deja la sesión
 * abierta y lo devuelve. Con el ingreso sólo por OAuth no hay formulario de registro. Nace con plan
 * Free, como cualquiera; con `plan: 'pro'` se lo sube después y se recarga para que la pantalla lo
 * sepa.
 *
 * Es el camino de verdad, de punta a punta: el botón de la pantalla de ingreso (F9-07), la pantalla
 * del IdP, el callback de la API y la cookie, hasta Home. El proveedor de desarrollo se nombra
 * distinto a propósito, para no confundirlo con uno de verdad.
 */
export async function registrarse(
  page: Page,
  opciones: { plan?: 'free' | 'pro'; conFoto?: boolean } = {},
): Promise<Atleta> {
  const atleta = atletaNuevo();

  await page.goto('/login');
  await page.getByRole('button', { name: BOTON_DESARROLLO }).click();
  await elegirEnElIdp(page, {
    email: atleta.email,
    nombre: atleta.nombre,
    conFoto: opciones.conFoto ?? false,
  });

  await expect(page.getByRole('heading', { name: 'Tus ejercicios' })).toBeVisible();

  if (opciones.plan === 'pro') {
    await fijarPlan(atleta.email, 'pro');
    await page.reload();
    await expect(
      page.getByRole('link', { name: 'Plan Pro: administrar suscripción' }),
    ).toBeVisible();
  }

  return atleta;
}

/** Cierra la sesión desde el menú, como lo haría una persona, y espera a estar en `/login`. */
export async function cerrarSesion(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
}

/** Lo que dice `/me` de la sesión de esta página, directo a la API. 401 si no hay sesión. */
export async function pedirMe(page: Page) {
  return page.request.get(`${apiUrl()}/api/v1/me`);
}

/**
 * Entra por la pestaña Catálogo y elige un precargado por su nombre: el formulario queda con su
 * definición cargada, a la espera de la primera marca.
 */
export async function elegirDelCatalogo(page: Page, nombre: string): Promise<void> {
  await page.goto('/ejercicios/nuevo');
  await page.getByLabel('Buscar en el catálogo').fill(nombre);
  await page.getByRole('button', { name: new RegExp(nombre) }).click();
  await expect(page.getByLabel('Nombre')).toHaveValue(nombre);
}

/** Agrega un ejercicio del catálogo con su primera marca, desde el formulario del mockup 9. */
export async function agregarDelCatalogo(page: Page, nombre: string, valor: string): Promise<void> {
  await elegirDelCatalogo(page, nombre);
  await page.getByLabel('RM (kg)').fill(valor);
  await page.getByLabel('Nivel').selectOption('intermedio');
  await page.getByRole('button', { name: 'Guardar ejercicio' }).click();

  await expect(page.getByRole('heading', { name: 'Tus ejercicios' })).toBeVisible();
}

/**
 * Sin violaciones WCAG 2.2 AA en la pantalla que está abierta (spec §11). Las reglas de
 * contraste corren en el navegador de verdad: es lo que jsdom no puede mirar.
 *
 * Espera a que terminen las transiciones: axe mide el color que hay en ese instante, y una
 * pestaña recién elegida a mitad de camino entre dos colores falla un contraste que no tiene.
 */
export async function auditar(page: Page, pantalla: string): Promise<void> {
  // Una animación que se cancela mientras se espera (la pantalla se redibuja con los datos que
  // llegan) rechaza `finished` con AbortError: ya no está corriendo, que es lo que se quiere.
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
    ),
  );

  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  // Con el elemento y el motivo: una violación sin el nodo que la causa no se arregla.
  const detalle = violations.flatMap((violation) =>
    violation.nodes.map(
      (node) =>
        `${violation.id} en ${node.target.join(' ')} — ${node.failureSummary ?? violation.help}`,
    ),
  );

  expect(detalle, `Violaciones de accesibilidad en ${pantalla}`).toEqual([]);
}
