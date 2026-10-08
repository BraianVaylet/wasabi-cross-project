import { describe, expect, it } from 'vitest';
import { marca, secciones, textos } from '../src/content/sitio.ts';

describe('contenido compartido', () => {
  it('las secciones tienen un id válido como ancla y sin repetir', () => {
    const ids = secciones.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
  });

  it('ningún texto está vacío', () => {
    for (const texto of [...Object.values(marca), ...Object.values(textos)]) {
      expect(texto.trim()).not.toBe('');
    }
    for (const { nombre } of secciones) expect(nombre.trim()).not.toBe('');
  });

  it('el nombre de la marca no lleva las barras: eso es del estilo', () => {
    expect(marca.nombre).toBe('Wasabi Cross');
  });
});
