import { describe, expect, it } from 'vitest';
import { lineaDeAcceso, puertoDeAstro } from '../src/lib/dev.ts';

/*
 * El acceso rápido de `pnpm dev` (spec §5.7, F10-01): al levantar la landing se imprime una línea
 * con la URL real, como la que muestra Vite para la web. La salida de Astro cambia según dónde
 * corre —texto normal en una terminal, JSON cuando detecta que lo corre un agente— y el puerto
 * puede no ser el 4321 si estaba ocupado: se lo lee de lo que Astro dijo.
 */

describe('puertoDeAstro()', () => {
  it('lee el puerto de la salida normal de Astro', () => {
    const salida =
      ' astro  v7.3.5 ready in 517 ms\n┃ Local    http://localhost:4321/\n┃ Network  use --host to expose\n';
    expect(puertoDeAstro(salida)).toBe(4321);
  });

  it('lo lee también cuando Astro escribe JSON, con la URL pegada a un \\n escapado', () => {
    // Lo que sale cuando Astro detecta un agente: la barra y la `n` son dos caracteres.
    const salida =
      '{"message":" astro  v7.3.5 ready in 517 ms\\n┃ Local    http://localhost:4321/\\n┃ Network  use --host to expose","label":"SKIP_FORMAT","level":"info"}';
    expect(puertoDeAstro(salida)).toBe(4321);
  });

  it('el puerto real, si el 4321 estaba ocupado y Astro tomó otro', () => {
    expect(puertoDeAstro('┃ Local    http://localhost:4322/\n')).toBe(4322);
  });

  it('acepta 127.0.0.1 y [::1] como locales', () => {
    expect(puertoDeAstro('┃ Local    http://127.0.0.1:4400/')).toBe(4400);
    expect(puertoDeAstro('┃ Local    http://[::1]:4401/')).toBe(4401);
  });

  it('con --host, la línea Network no cuenta: es la Local la que se abre', () => {
    const salida = '┃ Local    http://localhost:4321/\n┃ Network  http://192.168.0.12:4321/\n';
    expect(puertoDeAstro(salida)).toBe(4321);
    expect(puertoDeAstro('┃ Network  http://192.168.0.12:4321/\n')).toBeNull();
  });

  it('sin una URL local devuelve null', () => {
    expect(puertoDeAstro('')).toBeNull();
    expect(puertoDeAstro('18:53:21 [types] Generated 46ms')).toBeNull();
    expect(puertoDeAstro('http://localhost/sin-puerto')).toBeNull();
  });
});

describe('lineaDeAcceso()', () => {
  it('es una línea con el nombre y la URL, con la flecha de Vite', () => {
    expect(lineaDeAcceso('Landing', 4321)).toBe('  ➜  Landing: http://localhost:4321/');
  });

  it('usa el puerto que se le da', () => {
    expect(lineaDeAcceso('Landing', 4322)).toContain('http://localhost:4322/');
  });
});
