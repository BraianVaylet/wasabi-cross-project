import { useCallback, useEffect, useState } from 'react';
import {
  isInstalled,
  isIosDevice,
  rememberInstallDismissal,
  wasInstallDismissedRecently,
} from '../lib/install.ts';

/** El evento de Chromium que ofrece instalar la PWA. No está en `lib.dom`: no es un estándar. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallPrompt =
  /** Nada que proponer: ya está instalada, el usuario dijo que no, o el navegador no puede. */
  | { mode: 'none' }
  /** Chromium: se puede abrir el diálogo nativo de instalación. */
  | { mode: 'native'; install: () => Promise<void>; dismiss: () => void }
  /** iOS: no hay diálogo; sólo se puede explicar cómo hacerlo a mano. */
  | { mode: 'manual'; dismiss: () => void };

/**
 * Decide si hay que proponerle al usuario instalar la PWA (spec §5), y le da al popup lo que
 * necesita para hacerlo. La propuesta aparece sólo si la app no está instalada, el navegador
 * puede instalarla (Chromium, que avisa con `beforeinstallprompt`, o iOS, donde es a mano) y el
 * usuario no dijo "Ahora no" en las últimas semanas.
 */
export function useInstallPrompt(): InstallPrompt {
  const [offer, setOffer] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isInstalled(window));
  const [dismissed, setDismissed] = useState(() =>
    wasInstallDismissedRecently(window.localStorage, Date.now()),
  );

  useEffect(() => {
    const onOffer = (event: Event): void => {
      // Sin esto Chromium muestra su propio mini-aviso: la propuesta es la del popup.
      event.preventDefault();
      setOffer(event as BeforeInstallPromptEvent);
    };
    const onInstalled = (): void => {
      // Instalada por este aviso o por el menú del navegador: da igual, ya no hay qué proponer.
      setInstalled(true);
      setOffer(null);
    };

    window.addEventListener('beforeinstallprompt', onOffer);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onOffer);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    rememberInstallDismissal(window.localStorage, Date.now());
    setDismissed(true);
  }, []);

  const install = useCallback(async () => {
    if (!offer) {
      return;
    }
    // El evento sirve una sola vez: se suelta antes de abrir el diálogo.
    setOffer(null);
    await offer.prompt();
    const { outcome } = await offer.userChoice;
    if (outcome === 'dismissed') {
      dismiss();
    }
  }, [offer, dismiss]);

  if (installed || dismissed) {
    return { mode: 'none' };
  }
  if (offer) {
    return { mode: 'native', install, dismiss };
  }
  if (isIosDevice(window.navigator)) {
    return { mode: 'manual', dismiss };
  }
  return { mode: 'none' };
}
