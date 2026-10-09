import { randomUUID } from 'node:crypto';
import type { Plan } from '@wasabi-cross/schemas';
import type { TestHelpers } from 'better-auth/plugins';
import type { TestHarness } from './harness.ts';

/*
 * Sesiones para los tests de integración (F9-04, ADR-0012). Con el ingreso sólo por OAuth no hay
 * formulario de registro con el que obtener una cookie, y recorrer el flujo del proveedor en cada
 * test sería lento y ajeno a lo que se prueba. El plugin `testUtils` de Better Auth —que `createAuth`
 * trae sólo con NODE_ENV=test— crea el usuario y la sesión directo en la base, con la misma cookie
 * firmada que daría un ingreso de verdad.
 */

export interface TestSession {
  /** Para el header `cookie` del request siguiente. */
  cookie: string;
  userId: string;
  email: string;
}

export interface TestSessionOptions {
  email?: string;
  name?: string;
  /** Free por defecto, como cualquiera que se registra (spec §4). */
  plan?: Plan;
  /** El `user.image` que guardaría Better Auth: un data URL o una URL de Google (F9-08). Sin foto, si no va. */
  image?: string;
}

async function testHelpers(harness: TestHarness): Promise<TestHelpers> {
  // `testUtils` agrega `ctx.test`, pero su tipo no entra en el de `Auth`: se lo pide con un
  // tipo propio y se falla fuerte si no está (es decir, si NODE_ENV no es `test`).
  const context = (await harness.auth.$context) as unknown as { test?: TestHelpers };
  if (!context.test) {
    throw new Error(
      'testUtils no está en createAuth: los helpers de test sólo existen con NODE_ENV=test',
    );
  }
  return context.test;
}

/** Un usuario nuevo, sin contraseña ni cuentas de proveedor, con su sesión abierta. */
export async function createTestSession(
  harness: TestHarness,
  options: TestSessionOptions = {},
): Promise<TestSession> {
  const test = await testHelpers(harness);
  const email = options.email ?? `sesion-${randomUUID()}@example.com`;

  const user = await test.saveUser(
    test.createUser({
      email,
      name: options.name ?? 'Atleta de test',
      plan: options.plan ?? 'free',
      ...(options.image === undefined ? {} : { image: options.image }),
    }),
  );
  const { headers } = await test.login({ userId: user.id });

  return { cookie: headers.get('cookie') ?? '', userId: user.id, email };
}

/** Otra sesión de un usuario que ya existe: la cookie de entrar desde otro dispositivo. */
export async function openSession(harness: TestHarness, userId: string): Promise<string> {
  const test = await testHelpers(harness);
  const { headers } = await test.login({ userId });

  return headers.get('cookie') ?? '';
}
