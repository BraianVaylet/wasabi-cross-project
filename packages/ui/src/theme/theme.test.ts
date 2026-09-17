import { describe, expect, it } from 'vitest';
import { applyTheme, isTheme, nextTheme, resolveInitialTheme } from './theme.ts';

describe('isTheme', () => {
  it('reconoce los dos temas y rechaza cualquier otra cosa', () => {
    expect(isTheme('dark')).toBe(true);
    expect(isTheme('light')).toBe(true);
    expect(isTheme('sepia')).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(1)).toBe(false);
  });
});

describe('resolveInitialTheme', () => {
  it('la elección guardada del usuario gana sobre la preferencia del sistema', () => {
    expect(resolveInitialTheme('light', false)).toBe('light');
    expect(resolveInitialTheme('dark', true)).toBe('dark');
  });

  it('sin elección previa, respeta la preferencia del sistema', () => {
    expect(resolveInitialTheme(null, true)).toBe('light');
    expect(resolveInitialTheme(null, false)).toBe('dark');
  });

  it('sin elección ni preferencia conocida, arranca oscuro (dark first)', () => {
    expect(resolveInitialTheme(null)).toBe('dark');
  });

  it('ignora un valor guardado corrupto y no rompe', () => {
    expect(resolveInitialTheme('{"theme":"dark"}', false)).toBe('dark');
  });
});

describe('applyTheme', () => {
  it('escribe el tema en el data-theme del elemento', () => {
    const root = document.createElement('html');
    applyTheme('light', root);

    expect(root.dataset.theme).toBe('light');
  });
});

describe('nextTheme', () => {
  it('alterna entre los dos temas', () => {
    expect(nextTheme('dark')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
  });
});
