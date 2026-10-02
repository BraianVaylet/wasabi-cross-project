import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// jsdom no implementa scrollTo, y el router lo llama al navegar para restaurar el scroll.
window.scrollTo = () => undefined;

// Tampoco implementa matchMedia, que el aviso de instalación consulta al montar la app. Por
// defecto, una pestaña de navegador común: sin ningún display-mode de app instalada.
window.matchMedia = (query) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }) satisfies MediaQueryList;

/*
 * `findBy*` y `waitFor` esperan 1000 ms por defecto, y el primer render de cada archivo
 * (la app entera, en frío) no espera a la API falsa —responde al toque— sino a la CPU.
 * Solo tarda ~120 ms, pero en `pnpm verify` los cuatro workspaces testean a la vez y ese
 * mismo render se midió entre 600 y 1400 ms en varios archivos: fallaba el que perdía la
 * carrera. Esperar un landmark antes no cambia nada, porque también espera 1000 ms. Un
 * error de verdad falla igual, solo que a los 3 s, antes de los 5 s del test.
 */
configure({ asyncUtilTimeout: 3000 });
