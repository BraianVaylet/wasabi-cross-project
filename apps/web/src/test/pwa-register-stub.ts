import { useState } from 'react';

/*
 * El módulo virtual que inyecta vite-plugin-pwa (`virtual:pwa-register/react`) no existe
 * fuera del build: en los tests, `vitest.config.ts` lo resuelve acá. El test decide si hay
 * una versión nueva esperando.
 */

export const serviceWorkerStub = {
  /** Poner en `true` antes de renderizar simula una versión nueva ya descargada. */
  needRefresh: false,
  updates: 0,
  reset(): void {
    this.needRefresh = false;
    this.updates = 0;
  },
};

export function useRegisterSW(): {
  needRefresh: [boolean, (value: boolean) => void];
  offlineReady: [boolean, (value: boolean) => void];
  updateServiceWorker: () => Promise<void>;
} {
  const [needRefresh, setNeedRefresh] = useState(serviceWorkerStub.needRefresh);

  return {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [false, () => undefined],
    updateServiceWorker: () => {
      serviceWorkerStub.updates += 1;
      return Promise.resolve();
    },
  };
}
