import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import home from '../src/assets/capturas/01-home.png';
import Screenshot from '../src/components/Screenshot.astro';

/*
 * El componente `Screenshot` (F10-03): una captura de la app con su pie. El `alt` es obligatorio
 * por tipo (test/screenshot.types.ts) y acá, además, no puede estar vacío: una captura es una
 * imagen informativa, nunca decorativa.
 */

const base = {
  src: home,
  alt: 'Pantalla de inicio de Wasabi Cross con los ejercicios y sus marcas',
  pie: 'INICIO — Distintas marcas en una misma vista.',
  sizes: '(min-width: 768px) 430px, 100vw',
};

let contenedor: AstroContainer;
const render = (props: Record<string, unknown>): Promise<string> =>
  contenedor.renderToString(Screenshot, { props });

beforeAll(async () => {
  contenedor = await AstroContainer.create();
});

describe('<Screenshot>', () => {
  it('es una figure con la imagen y su pie', async () => {
    const html = await render(base);
    expect(html).toMatch(/<figure\b/);
    expect(html).toContain('<figcaption');
    expect(html).toContain('INICIO — Distintas marcas en una misma vista.');
  });

  it('la imagen lleva el alt, y el alt no se repite en el pie', async () => {
    const html = await render(base);
    expect(html).toContain(`alt="${base.alt}"`);
    expect(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/.exec(html)?.[1]).not.toContain(base.alt);
  });

  it('por defecto es lazy y asíncrona', async () => {
    const html = await render(base);
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
    expect(html).not.toContain('fetchpriority');
  });

  it('con `prioridad` (la del LCP) es eager y de prioridad alta', async () => {
    const html = await render({ ...base, prioridad: true });
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchpriority="high"');
    expect(html).not.toContain('loading="lazy"');
  });

  it('trae width y height: sin ellos la página salta al cargar la imagen', async () => {
    const html = await render(base);
    expect(html).toMatch(/\bwidth="\d+"/);
    expect(html).toMatch(/\bheight="\d+"/);
  });

  it('con `id` lo pone en la figure: es el destino de un ancla', async () => {
    expect(await render({ ...base, id: 'demo' })).toMatch(/<figure\b[^>]*\sid="demo"/);
    expect(await render(base)).not.toMatch(/<figure\b[^>]*\sid=/);
  });

  it('rechaza un alt vacío o de espacios', async () => {
    await expect(render({ ...base, alt: '' })).rejects.toThrow(/alt/);
    await expect(render({ ...base, alt: '   ' })).rejects.toThrow(/alt/);
  });
});
