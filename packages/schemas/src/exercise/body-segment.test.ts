import { describe, expect, it } from 'vitest';
import { bodySegmentFor } from './body-segment.ts';
import { muscleGroupSchema } from './exercise.schema.ts';

describe('bodySegmentFor — el segmento no se pregunta, sale del grupo primario (spec §5.1)', () => {
  it('los grupos de arriba dan tren superior', () => {
    expect(bodySegmentFor('pectoral')).toBe('tren_superior');
    expect(bodySegmentFor('trapecio')).toBe('tren_superior');
  });

  it('los de abajo dan tren inferior', () => {
    expect(bodySegmentFor('cuadriceps')).toBe('tren_inferior');
    expect(bodySegmentFor('gemelo')).toBe('tren_inferior');
  });

  it('el core y la espalda baja dan core', () => {
    expect(bodySegmentFor('core')).toBe('core');
    expect(bodySegmentFor('espalda_baja')).toBe('core');
  });

  it('cuerpo completo da cuerpo completo', () => {
    expect(bodySegmentFor('cuerpo_completo')).toBe('cuerpo_completo');
  });

  it('cada grupo muscular tiene su segmento: ninguno queda sin mapear', () => {
    for (const grupo of muscleGroupSchema.options) {
      expect(bodySegmentFor(grupo), grupo).toMatch(
        /^(tren_superior|tren_inferior|core|cuerpo_completo)$/,
      );
    }
  });
});
