import { describe, expect, it } from 'vitest';
import { FALLBACK_NAME, profileName } from './profile.ts';

describe('profileName — el nombre visible sale del proveedor (spec §5.6)', () => {
  it('usa el nombre que trae el proveedor', () => {
    expect(profileName({ name: 'Braian Vaylet', email: 'braian@example.com' })).toBe(
      'Braian Vaylet',
    );
  });

  it('le saca los espacios de los costados', () => {
    expect(profileName({ name: '  Ana  ', email: 'ana@example.com' })).toBe('Ana');
  });

  it.each([
    ['no lo trae', { email: 'ana.lopez@example.com' }],
    ['viene vacío', { name: '', email: 'ana.lopez@example.com' }],
    ['viene en blanco', { name: '   ', email: 'ana.lopez@example.com' }],
    ['no es un texto', { name: 42, email: 'ana.lopez@example.com' }],
  ])('si el nombre %s, usa la parte local del email', (_case, profile) => {
    expect(profileName(profile)).toBe('ana.lopez');
  });

  it('respeta las mayúsculas del email y no inventa un nombre más lindo', () => {
    expect(profileName({ email: 'Beto_99@example.com' })).toBe('Beto_99');
  });

  it.each([
    ['sin nombre ni email', {}],
    ['con un email vacío', { email: '' }],
    ['con un email sin parte local', { email: '@example.com' }],
    ['con un email que no es un texto', { email: null }],
  ])('%s, cae en el nombre de siempre', (_case, profile) => {
    expect(profileName(profile)).toBe(FALLBACK_NAME);
  });
});
