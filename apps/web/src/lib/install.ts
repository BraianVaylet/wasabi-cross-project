/*
 * Instalación de la PWA (spec §5): cómo saber si el usuario ya la tiene y cuándo no insistirle.
 * Sin React ni red: lo que lee del navegador entra por parámetro, así se prueba sin el navegador.
 */

/** Cuánto calla el aviso de instalación después de un "Ahora no". */
export const INSTALL_REMINDER_MS = 14 * 24 * 60 * 60 * 1000;

const DISMISSED_KEY = 'wc:install-dismissed-at';

/** Los modos con los que el sistema abre una PWA instalada: una pestaña normal es `browser`. */
const INSTALLED_DISPLAY_MODES = [
  '(display-mode: standalone)',
  '(display-mode: fullscreen)',
  '(display-mode: minimal-ui)',
  '(display-mode: window-controls-overlay)',
].join(', ');

/**
 * `true` si la app está corriendo instalada. Es lo único que el navegador deja saber desde
 * adentro: una pestaña del navegador no sabe si en el mismo dispositivo hay otra copia instalada
 * (en Chromium, eso lo cubre `appinstalled` y que `beforeinstallprompt` no se dispare).
 */
export function isInstalled(win: Window): boolean {
  // `navigator.standalone` es de Safari en iOS, que no entiende `display-mode`.
  const standaloneIos = (win.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return win.matchMedia(INSTALLED_DISPLAY_MODES).matches || standaloneIos;
}

/**
 * iOS es el único que no dispara `beforeinstallprompt`: ahí la instalación es manual (Compartir →
 * Agregar a inicio) y el aviso sólo puede explicarla. Desde iPadOS 13 el iPad dice ser una Mac;
 * lo delata la pantalla táctil.
 */
export function isIosDevice(nav: Pick<Navigator, 'userAgent' | 'maxTouchPoints'>): boolean {
  if (/iPhone|iPad|iPod/.test(nav.userAgent)) {
    return true;
  }
  return nav.userAgent.includes('Macintosh') && nav.maxTouchPoints > 1;
}

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

/** ¿El usuario dijo "Ahora no" hace menos de `INSTALL_REMINDER_MS`? */
export function wasInstallDismissedRecently(store: KeyValueStore, now: number): boolean {
  try {
    const dismissedAt = Number(store.getItem(DISMISSED_KEY));
    return (
      Number.isFinite(dismissedAt) && dismissedAt > 0 && now - dismissedAt < INSTALL_REMINDER_MS
    );
  } catch {
    // Sin almacenamiento (modo privado, datos bloqueados): se avisa y listo.
    return false;
  }
}

export function rememberInstallDismissal(store: KeyValueStore, now: number): void {
  try {
    store.setItem(DISMISSED_KEY, String(now));
  } catch {
    // Mismo caso: no se puede recordar, no es motivo para romper nada.
  }
}
