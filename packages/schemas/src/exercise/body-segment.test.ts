import { describe, expect, it } from 'vitest';
import { bodySegmentFor } from './body-segment.ts';

describe('bodySegmentFor — el segmento no se pregunta, se deriva (spec §5.1)', () => {
  it('los grupos de arriba dan tren superior', () => {
    expect(bodySegmentFor(['pectoral', 'triceps'])).toBe('tren_superior');
  });

  it('los de abajo dan tren inferior', () => {
    expect(bodySegmentFor(['cuadriceps', 'gluteo', 'isquiotibiales'])).toBe('tren_inferior');
  });

  it('el core solo es core', () => {
    expect(bodySegmentFor(['core'])).toBe('core');
  });

  it('mezclar segmentos da cuerpo completo', () => {
    expect(bodySegmentFor(['cuadriceps', 'hombro'])).toBe('cuerpo_completo');
    expect(bodySegmentFor(['core', 'gemelo'])).toBe('cuerpo_completo');
  });

  it('cuerpo completo arrastra al resto', () => {
    expect(bodySegmentFor(['cuerpo_completo'])).toBe('cuerpo_completo');
    expect(bodySegmentFor(['cuerpo_completo', 'biceps'])).toBe('cuerpo_completo');
  });

  it('cada grupo muscular tiene su segmento: ninguno queda sin mapear', () => {
    const grupos = [
      'pectoral',
      'espalda',
      'hombro',
      'biceps',
      'triceps',
      'antebrazo',
      'core',
      'gluteo',
      'cuadriceps',
      'isquiotibiales',
      'gemelo',
      'cuerpo_completo',
    ] as const;

    for (const grupo of grupos) {
      expect(bodySegmentFor([grupo]), grupo).toMatch(
        /tren_superior|tren_inferior|core|cuerpo_completo/,
      );
    }
  });
});
