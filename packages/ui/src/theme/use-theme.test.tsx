import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY } from './theme.ts';
import { useTheme } from './use-theme.ts';

function mockPrefersLight(prefersLight: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: prefersLight,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    mockPrefersLight(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('arranca en oscuro si el sistema no prefiere claro', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
  });

  it('arranca en claro si el sistema lo prefiere', () => {
    mockPrefersLight(true);
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
  });

  it('aplica el tema al documento', () => {
    renderHook(() => useTheme());

    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('toggle alterna el tema y lo aplica', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggle();
    });

    expect(result.current.theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('persiste la elección y la recupera en el siguiente arranque', () => {
    const { result, unmount } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('light');
    });
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    unmount();

    const segundoArranque = renderHook(() => useTheme());
    expect(segundoArranque.result.current.theme).toBe('light');
  });

  it('si localStorage no está disponible, sigue funcionando sin persistir', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('modo privado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('modo privado');
    });

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
    act(() => {
      result.current.toggle();
    });
    expect(result.current.theme).toBe('light');
  });
});
