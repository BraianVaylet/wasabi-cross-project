import { describe, expect, it } from 'vitest';
import { enabledProviders } from './oauth-settings.ts';

const none = { OAUTH_DEV_IDP: 'off' as const };

describe('enabledProviders', () => {
  it('sin credenciales ni IdP de desarrollo, no hay ninguno', () => {
    expect([...enabledProviders(none)]).toEqual([]);
  });

  it('Google queda habilitado con su par completo', () => {
    expect([
      ...enabledProviders({ ...none, GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secreto' }),
    ]).toEqual(['google']);
  });

  it('Microsoft queda habilitado con su par completo', () => {
    expect([
      ...enabledProviders({
        ...none,
        MICROSOFT_CLIENT_ID: 'id',
        MICROSOFT_CLIENT_SECRET: 'secreto',
      }),
    ]).toEqual(['microsoft']);
  });

  it('un par a medias no habilita nada: parseEnv ya lo rechaza, esto es la segunda red', () => {
    expect([...enabledProviders({ ...none, GOOGLE_CLIENT_ID: 'id' })]).toEqual([]);
    expect([...enabledProviders({ ...none, MICROSOFT_CLIENT_SECRET: 'secreto' })]).toEqual([]);
  });

  it('el IdP de desarrollo se habilita con OAUTH_DEV_IDP=on, solo o junto a los demás', () => {
    expect([...enabledProviders({ OAUTH_DEV_IDP: 'on' })]).toEqual(['fake-idp']);
    expect([
      ...enabledProviders({
        OAUTH_DEV_IDP: 'on',
        GOOGLE_CLIENT_ID: 'id',
        GOOGLE_CLIENT_SECRET: 'secreto',
      }),
    ]).toEqual(expect.arrayContaining(['google', 'fake-idp']));
  });
});
