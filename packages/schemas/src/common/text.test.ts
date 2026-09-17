import { describe, expect, it } from 'vitest';
import { plainText } from './text.ts';

const notes = plainText(20);

describe('plainText', () => {
  it('acepta texto plano y le saca los espacios de los bordes', () => {
    expect(notes.parse('  sentadilla  ')).toBe('sentadilla');
  });

  it('rechaza HTML en vez de sanitizarlo', () => {
    expect(notes.safeParse('<b>hola</b>').success).toBe(false);
    expect(notes.safeParse('<script>x</script>').success).toBe(false);
    expect(notes.safeParse('<img src=x onerror=y>').success).toBe(false);
  });

  it('acepta un < suelto que no forma una etiqueta', () => {
    expect(notes.parse('peso < 100')).toBe('peso < 100');
  });

  it('respeta el largo máximo, medido después del trim', () => {
    expect(notes.safeParse('a'.repeat(21)).success).toBe(false);
    expect(notes.safeParse(`  ${'a'.repeat(20)}  `).success).toBe(true);
  });
});
