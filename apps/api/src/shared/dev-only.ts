import type { Env } from '../config/env.ts';

/**
 * Frena lo que es sólo de desarrollo —el seed del admin Pro, el IdP falso— si el proceso corre con
 * `NODE_ENV=production`. Es la segunda red: ninguna de esas cosas se despliega, pero alguien puede
 * correrlas a mano con la variable puesta, y ahí sembrarían un admin Pro con una cuenta conocida.
 */
export function assertDevelopmentOnly(env: Pick<Env, 'NODE_ENV'>, what: string): void {
  if (env.NODE_ENV === 'production') {
    throw new Error(`${what} es sólo para desarrollo: no corre con NODE_ENV=production.`);
  }
}
