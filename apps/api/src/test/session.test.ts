import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestApi, type TestHarness } from './harness.ts';
import { createTestSession, openSession } from './session.ts';

describe('createTestSession — sesiones de test sin formulario ni contraseña (F9-04)', () => {
  let harness: TestHarness;

  beforeAll(async () => {
    harness = await startTestApi();
  });

  afterAll(async () => {
    await harness.stop();
  });

  async function me(cookie: string) {
    return harness.app.inject({ method: 'GET', url: '/api/v1/me', headers: { cookie } });
  }

  it('devuelve una cookie que /me acepta, con el usuario y el plan pedidos', async () => {
    const session = await createTestSession(harness, { plan: 'pro' });

    const response = await me(session.cookie);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: session.userId,
      email: session.email,
      plan: 'pro',
    });
  });

  it('por defecto el usuario es Free, como el que se registra', async () => {
    const session = await createTestSession(harness);

    expect((await me(session.cookie)).json()).toMatchObject({ plan: 'free' });
  });

  it('se puede elegir el email y el nombre', async () => {
    const session = await createTestSession(harness, {
      email: 'ana@example.com',
      name: 'Ana',
    });

    expect(session.email).toBe('ana@example.com');
    expect((await me(session.cookie)).json()).toMatchObject({
      email: 'ana@example.com',
      name: 'Ana',
    });
  });

  it('cada llamada es un usuario distinto: los tests no se pisan entre sí', async () => {
    const first = await createTestSession(harness);
    const second = await createTestSession(harness);

    expect(second.userId).not.toBe(first.userId);
    expect(second.email).not.toBe(first.email);
  });

  it('el id lleva el prefijo de usuario (ADR-0004), como el de uno real', async () => {
    const session = await createTestSession(harness);

    expect(session.userId).toMatch(/^usr_/);
  });

  it('el usuario nace sin contraseña: no hay ninguna cuenta con credenciales', async () => {
    const session = await createTestSession(harness);

    const accounts = await harness.mongo.db
      .collection('account')
      .countDocuments({ userId: session.userId });

    expect(accounts).toBe(0);
  });

  it('una cookie inventada no abre sesión: la firma tiene que ser la de verdad', async () => {
    const session = await createTestSession(harness);
    const forged = session.cookie.replace(/=.*$/, '=token-inventado.firma-inventada');

    expect((await me(forged)).statusCode).toBe(401);
  });

  it('openSession abre otra sesión del mismo usuario, como entrar desde otro dispositivo', async () => {
    const first = await createTestSession(harness, { plan: 'pro' });

    const otherDevice = await openSession(harness, first.userId);

    expect(otherDevice).not.toBe(first.cookie);
    expect((await me(otherDevice)).json()).toMatchObject({ id: first.userId, plan: 'pro' });
    expect((await me(first.cookie)).statusCode).toBe(200);
  });

  it('openSession con un usuario que no existe falla en vez de inventarlo', async () => {
    await expect(openSession(harness, 'usr_no_existe')).rejects.toThrow(/no existe|not found/i);
  });
});
