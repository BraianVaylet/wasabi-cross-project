/*
 * Quién responde en las páginas legales (spec §5.7 y §13). Dos variables de build:
 *
 *   - `PUBLIC_CONTACT_NAME`: el nombre de quien responde por el servicio.
 *   - `PUBLIC_CONTACT_EMAIL`: a dónde se escribe para ver, corregir o borrar los datos.
 *
 * No están en el repo: son datos de una persona, y el repo no los necesita. Las pone quien despliega,
 * como `PUBLIC_APP_URL` y `PUBLIC_SITE_URL`.
 */

export interface Contacto {
  nombre: string;
  email: string;
}

const LARGO_MAXIMO_NOMBRE = 100;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Lee las dos variables. **Una combinación que no tiene sentido rompe el build**, como en
 * `configurarSeo`:
 *
 *   - Sólo una de las dos, o un valor que no es un nombre o un email: siempre.
 *   - Ninguna, con `indexable`: una política de privacidad que no dice quién responde no se publica.
 *   - Ninguna, sin `indexable` (desarrollo, CI, staging sin datos): `null`, y la página avisa que
 *     el contacto falta en vez de inventar uno.
 */
export function configurarContacto(
  nombre: string | undefined,
  email: string | undefined,
  indexable: boolean,
): Contacto | null {
  const n = nombre?.trim() ?? '';
  const e = email?.trim() ?? '';

  if (n === '' && e === '') {
    if (indexable) {
      throw new Error(
        'LANDING_INDEXABLE=1 necesita PUBLIC_CONTACT_NAME y PUBLIC_CONTACT_EMAIL: la política de privacidad tiene que decir quién responde',
      );
    }
    return null;
  }

  if (n === '' || e === '') {
    throw new Error(
      'PUBLIC_CONTACT_NAME y PUBLIC_CONTACT_EMAIL van juntos: falta ' +
        (n === '' ? 'PUBLIC_CONTACT_NAME' : 'PUBLIC_CONTACT_EMAIL'),
    );
  }
  if (/[\r\n]/.test(n) || n.length > LARGO_MAXIMO_NOMBRE) {
    throw new Error(
      `PUBLIC_CONTACT_NAME tiene que ser una línea de hasta ${String(LARGO_MAXIMO_NOMBRE)} caracteres`,
    );
  }
  if (!EMAIL.test(e)) {
    throw new Error(`PUBLIC_CONTACT_EMAIL ("${e}") no es un email`);
  }
  return { nombre: n, email: e };
}
