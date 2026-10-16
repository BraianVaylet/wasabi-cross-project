import { describe, expect, it } from 'vitest';
import { describeOutcome, parseSetPlanArgs } from './set-plan-cli.ts';

/*
 * F3-15: el borde del script. Lo que se tipea a mano en una terminal contra producción tiene que
 * fallar fuerte ante un error de tipeo, y lo que se imprime tiene que decir en qué base se escribió.
 */

describe('parseSetPlanArgs', () => {
  it('lee el email y el plan; sin --apply es un dry-run', () => {
    expect(parseSetPlanArgs(['--email', 'braian@example.com', '--plan', 'pro'])).toEqual({
      email: 'braian@example.com',
      plan: 'pro',
      apply: false,
    });
  });

  it('con --apply escribe', () => {
    expect(parseSetPlanArgs(['--email', 'a@example.com', '--plan', 'free', '--apply'])).toEqual({
      email: 'a@example.com',
      plan: 'free',
      apply: true,
    });
  });

  it('tolera el `--` que algunos gestores de paquetes dejan delante de los argumentos', () => {
    expect(parseSetPlanArgs(['--', '--email', 'a@example.com', '--plan', 'pro'])).toMatchObject({
      email: 'a@example.com',
      plan: 'pro',
    });
  });

  it.each([
    ['sin email', ['--plan', 'pro']],
    ['sin plan', ['--email', 'a@example.com']],
    ['sin nada', []],
    ['con una opción que no existe', ['--email', 'a@example.com', '--plan', 'pro', '--force']],
    ['con un argumento suelto', ['--email', 'a@example.com', '--plan', 'pro', 'ahora']],
  ])('falla %s y muestra el uso', (_nombre, argv) => {
    expect(() => parseSetPlanArgs(argv)).toThrow(/Uso: plan:set/);
  });
});

describe('describeOutcome', () => {
  const where = { database: 'wasabi_cross', environment: 'production' };

  it('un cambio aplicado dice la base, el antes y el después', () => {
    const text = describeOutcome(
      { status: 'changed', email: 'braian@example.com', from: 'free', to: 'pro' },
      where,
    ).join('\n');

    expect(text).toContain('braian@example.com');
    expect(text).toContain('free → pro');
    expect(text).toContain('wasabi_cross');
    expect(text).toContain('production');
  });

  it('un dry-run avisa que no escribió y cómo aplicarlo', () => {
    const text = describeOutcome(
      { status: 'would-change', email: 'braian@example.com', from: 'free', to: 'pro' },
      where,
    ).join('\n');

    expect(text).toMatch(/no se escribió/i);
    expect(text).toContain('--apply');
    expect(text).toContain('wasabi_cross');
  });

  it('un plan que ya estaba puesto lo dice', () => {
    const text = describeOutcome(
      { status: 'unchanged', email: 'braian@example.com', plan: 'pro' },
      where,
    ).join('\n');

    expect(text).toMatch(/ya tiene/i);
  });
});
