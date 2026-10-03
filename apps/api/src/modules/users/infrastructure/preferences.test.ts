import type { UserPreferences } from '@wasabi-cross/schemas';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cookiesFrom, startTestApi, type TestHarness } from '../../../test/harness.ts';

const PASSWORD = 'una-frase-larga-y-propia';

describe('preferencias del usuario (F1-08)', () => {
  let harness: TestHarness;
  let userCount = 0;

  beforeAll(async () => {
    harness = await startTestApi();
  });

  afterAll(async () => {
    await harness.stop();
  });

  async function newUser(): Promise<{ cookie: string; email: string }> {
    userCount += 1;
    const email = `prefs${String(userCount)}@example.com`;
    const response = await harness.app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ email, password: PASSWORD, name: `Prefs ${String(userCount)}` }),
    });
    return { cookie: cookiesFrom(response.headers), email };
  }

  function read(cookie: string) {
    return harness.app.inject({
      method: 'GET',
      url: '/api/v1/me/preferences',
      headers: { cookie },
    });
  }

  function update(cookie: string, body: Record<string, unknown>) {
    return harness.app.inject({
      method: 'PATCH',
      url: '/api/v1/me/preferences',
      headers: { cookie, 'content-type': 'application/json' },
      payload: JSON.stringify(body),
    });
  }

  it('un usuario nuevo tiene los porcentajes por defecto', async () => {
    const { cookie } = await newUser();

    const response = await read(cookie);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ loadPercentages: [65, 75, 80, 85, 90, 95] });
  });

  it('guarda los porcentajes y los devuelve', async () => {
    const { cookie } = await newUser();

    const response = await update(cookie, { loadPercentages: [60, 70, 80, 90] });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ loadPercentages: [60, 70, 80, 90] });
    expect((await read(cookie)).json<UserPreferences>().loadPercentages).toEqual([60, 70, 80, 90]);
  });

  it('los porcentajes guardados los recupera el próximo login, en otro dispositivo', async () => {
    const { cookie, email } = await newUser();
    await update(cookie, { loadPercentages: [55, 65] });

    const login = await harness.app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ email, password: PASSWORD }),
    });
    const otroDispositivo = cookiesFrom(login.headers);

    expect(otroDispositivo).not.toBe(cookie);
    expect((await read(otroDispositivo)).json<UserPreferences>().loadPercentages).toEqual([55, 65]);
  });

  it('las preferencias son de cada usuario', async () => {
    const braian = await newUser();
    const amigo = await newUser();

    await update(braian.cookie, { loadPercentages: [70] });

    expect((await read(amigo.cookie)).json()).toEqual({
      loadPercentages: [65, 75, 80, 85, 90, 95],
    });
  });

  describe('validación, con el motivo por campo', () => {
    it('porcentajes repetidos', async () => {
      const { cookie } = await newUser();

      const response = await update(cookie, { loadPercentages: [70, 80, 70] });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        errorCode: 'WC-SYS-400-002',
        details: [{ path: 'loadPercentages', message: 'No puede haber porcentajes repetidos' }],
      });
    });

    it('porcentajes fuera de 1–100', async () => {
      const { cookie } = await newUser();

      const response = await update(cookie, { loadPercentages: [0, 50, 101] });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        errorCode: 'WC-SYS-400-002',
        details: [
          { path: 'loadPercentages.0', message: 'El porcentaje mínimo es 1' },
          { path: 'loadPercentages.2', message: 'El porcentaje máximo es 100' },
        ],
      });
    });

    it('más de 12 porcentajes', async () => {
      const { cookie } = await newUser();

      const response = await update(cookie, {
        loadPercentages: Array.from({ length: 13 }, (_, i) => 10 + i * 5),
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        errorCode: 'WC-SYS-400-002',
        details: [{ path: 'loadPercentages', message: 'Como máximo 12 porcentajes' }],
      });
    });

    it('un campo que ya no existe (ADR-0008: theme), un campo ajeno o un cambio vacío', async () => {
      const { cookie } = await newUser();

      expect((await update(cookie, { theme: 'dark' })).statusCode).toBe(400);
      expect((await update(cookie, { loadPercentages: [70], plan: 'pro' })).statusCode).toBe(400);
      expect((await update(cookie, {})).statusCode).toBe(400);
    });

    it('un cambio rechazado no guarda nada', async () => {
      const { cookie } = await newUser();

      await update(cookie, { loadPercentages: [70, 70] });

      expect((await read(cookie)).json()).toEqual({
        loadPercentages: [65, 75, 80, 85, 90, 95],
      });
    });
  });

  it('sin sesión, ni lee ni guarda', async () => {
    const get = await harness.app.inject({ method: 'GET', url: '/api/v1/me/preferences' });
    const patch = await harness.app.inject({
      method: 'PATCH',
      url: '/api/v1/me/preferences',
      payload: { loadPercentages: [70] },
    });

    expect(get.statusCode).toBe(401);
    expect(patch.statusCode).toBe(401);
  });
});
