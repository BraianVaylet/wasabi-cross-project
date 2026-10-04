import type { OauthProvider } from '@wasabi-cross/schemas';
import { describe, expect, it } from 'vitest';
import { requireEnabledProviders } from './require-providers.ts';

describe('requireEnabledProviders — sin ningún proveedor, nadie puede entrar (ADR-0012)', () => {
  it('con al menos uno habilitado, deja pasar', () => {
    expect(() => {
      requireEnabledProviders(new Set<OauthProvider>(['google']));
    }).not.toThrow();
    expect(() => {
      requireEnabledProviders(new Set<OauthProvider>(['fake-idp']));
    }).not.toThrow();
  });

  it('sin ninguno, se niega', () => {
    expect(() => {
      requireEnabledProviders(new Set());
    }).toThrow(/ningún proveedor/i);
  });

  it('el mensaje dice cómo habilitar uno, con los nombres de las variables', () => {
    let message = '';
    try {
      requireEnabledProviders(new Set());
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain('GOOGLE_CLIENT_ID');
    expect(message).toContain('GOOGLE_CLIENT_SECRET');
    expect(message).toContain('MICROSOFT_CLIENT_ID');
    expect(message).toContain('MICROSOFT_CLIENT_SECRET');
    expect(message).toContain('OAUTH_DEV_IDP=on');
  });
});
