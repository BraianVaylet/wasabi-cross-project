import { useCallback, useEffect, useState } from 'react';
import {
  THEME_STORAGE_KEY,
  applyTheme,
  nextTheme,
  resolveInitialTheme,
  type Theme,
} from './theme.ts';

function readStoredTheme(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    // Safari en modo privado tira al leer localStorage. El tema no vale una pantalla rota.
    return null;
  }
}

function prefersLight(): boolean {
  return window.matchMedia('(prefers-color-scheme: light)').matches;
}

/**
 * Estado del tema. Persiste la elección del usuario y la aplica al `<html>`.
 * Vive en la librería de UI porque es preferencia visual, no negocio.
 */
export function useTheme(): { theme: Theme; setTheme: (theme: Theme) => void; toggle: () => void } {
  const [theme, setThemeState] = useState<Theme>(() =>
    resolveInitialTheme(readStoredTheme(), prefersLight()),
  );

  useEffect(() => {
    applyTheme(theme, document.documentElement);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Sin localStorage el tema no sobrevive al reload. Es degradación aceptable.
    }
  }, [theme]);

  const setTheme = useCallback((value: Theme) => {
    setThemeState(value);
  }, []);

  const toggle = useCallback(() => {
    setThemeState(nextTheme);
  }, []);

  return { theme, setTheme, toggle };
}
