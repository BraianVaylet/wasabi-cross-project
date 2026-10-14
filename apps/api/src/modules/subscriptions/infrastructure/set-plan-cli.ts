import { parseArgs } from 'node:util';
import type { SetPlanOutcome } from '../application/set-plan.ts';

/**
 * El borde de `plan:set` (F3-15): los argumentos que se tipean a mano y lo que se imprime. Está
 * aparte del script para poder probarlo: un error de tipeo contra producción tiene que fallar
 * fuerte, y lo impreso tiene que decir en qué base se escribió.
 */

const USAGE = 'Uso: plan:set --email <email> --plan <free|pro> [--apply]';

/** Un error de uso: su mensaje alcanza, no hace falta el stack. */
export class UsageError extends Error {
  constructor(message: string) {
    super(`${message}\n${USAGE}`);
    this.name = 'UsageError';
  }
}

export interface SetPlanArgs {
  email: string;
  plan: string;
  apply: boolean;
}

export function parseSetPlanArgs(argv: readonly string[]): SetPlanArgs {
  // Algunos gestores de paquetes dejan un `--` delante de los argumentos del script.
  const args = argv[0] === '--' ? argv.slice(1) : argv;

  let values: {
    email?: string | undefined;
    plan?: string | undefined;
    apply?: boolean | undefined;
  };
  try {
    ({ values } = parseArgs({
      args: [...args],
      options: {
        email: { type: 'string' },
        plan: { type: 'string' },
        apply: { type: 'boolean' },
      },
      strict: true,
      allowPositionals: false,
    }));
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : String(error));
  }

  if (!values.email || !values.plan) {
    throw new UsageError('Faltan --email y --plan.');
  }

  return { email: values.email, plan: values.plan, apply: values.apply === true };
}

export interface Destination {
  /** El nombre de la base donde se escribe: es lo que impide confundir staging con producción. */
  database: string;
  environment: string;
}

export function describeOutcome(outcome: SetPlanOutcome, where: Destination): string[] {
  const base = `Base: ${where.database} (${where.environment}).`;

  switch (outcome.status) {
    case 'changed':
      return [
        `Listo: ${outcome.email} pasó de ${outcome.from} → ${outcome.to}.`,
        base,
        'Rige desde el pedido siguiente de esa persona, sin cerrar sesión.',
      ];
    case 'would-change':
      return [
        `Cambiaría ${outcome.email}: ${outcome.from} → ${outcome.to}.`,
        base,
        'No se escribió nada. Agregá --apply para aplicarlo.',
      ];
    case 'unchanged':
      return [`${outcome.email} ya tiene el plan ${outcome.plan}: no hay nada que cambiar.`, base];
  }
}
