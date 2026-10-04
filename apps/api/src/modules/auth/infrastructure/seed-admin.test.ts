import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedAdmin } from '../application/seed-admin.ts';
import { startTestApi, type TestHarness } from '../../../test/harness.ts';
import { createTestSession, openSession } from '../../../test/session.ts';
import { createIdentityStore } from './identity-store.ts';

/*
 * El admin de desarrollo (F9-04, ADR-0012): un usuario fijo con plan Pro, ligado a una cuenta de un
 * proveedor y **sin contraseña**. Que la cuenta sea justo la que emite el IdP falso se prueba aparte,
 * en `dev-support/seed-admin.idp.test.ts`: `src/` no importa el IdP.
 */

describe('seedAdmin — el usuario fijo con plan Pro de desarrollo', () => {
  let harness: TestHarness;
  let count = 0;

  beforeAll(async () => {
    harness = await startTestApi();
  });

  afterAll(async () => {
    await harness.stop();
  });

  function options() {
    count += 1;
    return {
      email: `admin${String(count)}@wasabicross.dev`,
      name: 'Admin',
      providerId: 'fake-idp',
      accountId: `cuenta-del-proveedor-${String(count)}`,
    };
  }

  const store = () => createIdentityStore(harness.auth);
  const users = () => harness.mongo.db.collection('user');
  const accounts = () => harness.mongo.db.collection('account');

  it('crea el usuario con plan Pro y el email verificado', async () => {
    const admin = options();

    const result = await seedAdmin(store(), harness.mongo.db, admin);

    expect(result).toEqual({ email: admin.email, created: true });
    expect(await users().findOne({ email: admin.email })).toMatchObject({
      plan: 'pro',
      name: 'Admin',
      emailVerified: true,
    });
  });

  it('lo liga a la cuenta del proveedor, y no deja contraseña ni cuenta de credenciales', async () => {
    const admin = options();

    await seedAdmin(store(), harness.mongo.db, admin);

    const user = await users().findOne({ email: admin.email });
    const userAccounts = await accounts().find({ userId: user?._id }).toArray();
    expect(userAccounts).toHaveLength(1);
    expect(userAccounts[0]).toMatchObject({
      providerId: admin.providerId,
      accountId: admin.accountId,
    });
    expect(userAccounts.some((account) => account.providerId === 'credential')).toBe(false);
    expect(userAccounts.some((account) => 'password' in account)).toBe(false);
  });

  it('el usuario sembrado entra como Pro: Better Auth lo lee como a cualquiera', async () => {
    const admin = options();
    await seedAdmin(store(), harness.mongo.db, admin);
    const user = await users().findOne({ email: admin.email });

    const cookie = await openSession(harness, String(user?._id));
    const me = await harness.app.inject({ method: 'GET', url: '/api/v1/me', headers: { cookie } });

    expect(me.json()).toMatchObject({ email: admin.email, plan: 'pro' });
  });

  it('correrlo de nuevo no falla ni duplica: la segunda vez no crea nada', async () => {
    const admin = options();

    const primera = await seedAdmin(store(), harness.mongo.db, admin);
    const segunda = await seedAdmin(store(), harness.mongo.db, admin);

    expect(primera).toEqual({ email: admin.email, created: true });
    expect(segunda).toEqual({ email: admin.email, created: false });
    expect(await users().countDocuments({ email: admin.email })).toBe(1);
    expect(await accounts().countDocuments({ accountId: admin.accountId })).toBe(1);
  });

  it('si el usuario ya existe con plan Free, lo sube a Pro, lo liga y no lo vuelve a crear', async () => {
    const admin = options();
    const existing = await createTestSession(harness, {
      email: admin.email,
      name: 'Ya existía',
    });

    const result = await seedAdmin(store(), harness.mongo.db, admin);

    expect(result).toEqual({ email: admin.email, created: false });
    expect(await users().findOne({ email: admin.email })).toMatchObject({
      _id: existing.userId,
      plan: 'pro',
      name: 'Ya existía',
    });
    expect(await accounts().countDocuments({ userId: existing.userId })).toBe(1);
  });

  it('si esa cuenta del proveedor ya es de otro usuario, falla: no la roba ni la duplica', async () => {
    const owner = options();
    await seedAdmin(store(), harness.mongo.db, owner);
    const intruder = { ...options(), accountId: owner.accountId };

    await expect(seedAdmin(store(), harness.mongo.db, intruder)).rejects.toThrow(/otro usuario/);

    expect(await accounts().countDocuments({ accountId: owner.accountId })).toBe(1);
  });
});
