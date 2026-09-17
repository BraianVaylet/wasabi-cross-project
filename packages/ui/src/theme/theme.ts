export const THEMES = ['dark', 'light'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_STORAGE_KEY = 'wasabi-cross:theme';

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

/**
 * Qué tema mostrar al abrir la app: lo que el usuario eligió antes; si nunca eligió, lo
 * que prefiere su sistema; y si el sistema no dice nada, oscuro (spec §11, dark first).
 */
export function resolveInitialTheme(stored: string | null, prefersLight?: boolean): Theme {
  if (isTheme(stored)) {
    return stored;
  }

  return prefersLight === true ? 'light' : 'dark';
}

/** Aplica el tema al documento. Es lo único que toca el DOM fuera de React. */
export function applyTheme(theme: Theme, root: HTMLElement): void {
  root.dataset.theme = theme;
}

export function nextTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark';
}
