import { describe, expect, it } from 'vitest';
import { urlIngreso } from '../src/lib/app-url.ts';

/*
 * A dónde lleva "Entrar" (spec §5.7): al ingreso de la app (`/login`, §5.6), en la URL que dice la
 * variable de build `PUBLIC_APP_URL`. Sin ella —mientras la app no esté en producción— no hay a
 * dónde llevar y los botones no se muestran.
 */

describe('urlIngreso()', () => {
  it('sin variable (no definida o vacía) no hay a dónde llevar', () => {
    expect(urlIngreso(undefined)).toBeNull();
    expect(urlIngreso('')).toBeNull();
    expect(urlIngreso('   ')).toBeNull();
  });

  it('arma el /login sobre el origen de la app', () => {
    expect(urlIngreso('https://app.ejemplo.test')).toBe('https://app.ejemplo.test/login');
  });

  it('tolera la barra final y los espacios', () => {
    expect(urlIngreso('https://app.ejemplo.test/')).toBe('https://app.ejemplo.test/login');
    expect(urlIngreso('  https://app.ejemplo.test  ')).toBe('https://app.ejemplo.test/login');
  });

  it('conserva el puerto: en desarrollo la app está en otro', () => {
    expect(urlIngreso('http://localhost:5173')).toBe('http://localhost:5173/login');
  });

  it('falla fuerte con un valor que no es una URL http(s): un deploy mal configurado se nota', () => {
    expect(() => urlIngreso('app.ejemplo.test')).toThrow(/PUBLIC_APP_URL/);
    expect(() => urlIngreso('ftp://app.ejemplo.test')).toThrow(/http/);
  });

  it('nunca arma un enlace que ejecute código', () => {
    expect(() => urlIngreso('javascript:alert(1)')).toThrow(/http/);
    expect(() => urlIngreso('data:text/html,<script>alert(1)</script>')).toThrow(/http/);
  });
});
