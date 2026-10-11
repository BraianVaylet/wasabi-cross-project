import { describe, expect, it } from 'vitest';
import { configurarContacto } from '../src/lib/contacto.ts';

/*
 * Quién responde en la política de privacidad (F10-09, spec §5.7 y §13): dos variables de build,
 * `PUBLIC_CONTACT_NAME` y `PUBLIC_CONTACT_EMAIL`. Una política sin responsable no se publica: en
 * producción, sin las dos, el build se rompe.
 */

const NOMBRE = 'Titular de Prueba';
const EMAIL = 'contacto@ejemplo.test';

describe('configurarContacto()', () => {
  it('sin variables, fuera de producción, no hay contacto', () => {
    expect(configurarContacto(undefined, undefined, false)).toBeNull();
    expect(configurarContacto('', '', false)).toBeNull();
    expect(configurarContacto('   ', '\t', false)).toBeNull();
  });

  it('con las dos devuelve el nombre y el email, sin espacios de más', () => {
    expect(configurarContacto(`  ${NOMBRE} `, ` ${EMAIL}\n`, false)).toEqual({
      nombre: NOMBRE,
      email: EMAIL,
    });
    expect(configurarContacto(NOMBRE, EMAIL, true)).toEqual({ nombre: NOMBRE, email: EMAIL });
  });

  it('con sólo una rompe el build, también fuera de producción', () => {
    for (const indexable of [false, true]) {
      expect(() => configurarContacto(NOMBRE, undefined, indexable)).toThrow(
        /PUBLIC_CONTACT_NAME y PUBLIC_CONTACT_EMAIL/,
      );
      expect(() => configurarContacto(undefined, EMAIL, indexable)).toThrow(
        /PUBLIC_CONTACT_NAME y PUBLIC_CONTACT_EMAIL/,
      );
      expect(() => configurarContacto(NOMBRE, '  ', indexable)).toThrow();
    }
  });

  it('en producción, sin ninguna, rompe el build y dice por qué', () => {
    expect(() => configurarContacto(undefined, undefined, true)).toThrow(
      /LANDING_INDEXABLE=1 necesita PUBLIC_CONTACT_NAME y PUBLIC_CONTACT_EMAIL/,
    );
    expect(() => configurarContacto('', ' ', true)).toThrow(/quién responde/);
  });

  it('un email que no es un email rompe el build', () => {
    for (const malo of [
      'contacto',
      'contacto@',
      '@ejemplo.test',
      'con tacto@ejemplo.test',
      'a@b',
    ]) {
      expect(() => configurarContacto(NOMBRE, malo, false), malo).toThrow(/PUBLIC_CONTACT_EMAIL/);
    }
  });

  it('un nombre con saltos de línea o de más de 100 caracteres rompe el build', () => {
    expect(() => configurarContacto('Una\nPersona', EMAIL, false)).toThrow(/PUBLIC_CONTACT_NAME/);
    expect(() => configurarContacto('x'.repeat(101), EMAIL, false)).toThrow(/PUBLIC_CONTACT_NAME/);
  });
});
