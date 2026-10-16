import { planSchema, type Plan } from '@wasabi-cross/schemas';
import { z } from 'zod';
import type { PlanSource, PlanStore } from '../domain/plan-store.ts';

/**
 * Cambia el plan de un usuario (F3-15, ADR-0014). Es el único lugar que escribe el plan: hoy lo
 * llama el script de operador `plan:set`, y cuando llegue la pasarela, su webhook.
 *
 * Es una decisión sobre quién ve una función de pago, así que es estricto:
 *
 * - Sólo cambia a un usuario que **ya existe**. La identidad nace del ingreso por un proveedor
 *   (spec §5.6); acá no se crean cuentas.
 * - Un plan que no es `free` ni `pro` se rechaza antes de mirar la base.
 * - Sin `apply` no escribe: dice qué cambiaría.
 * - Pedir el plan que ya tiene no escribe: no mueve la fecha de un otorgamiento anterior.
 */

export type SetPlanErrorCode = 'INVALID_PLAN' | 'INVALID_EMAIL' | 'USER_NOT_FOUND';

/** Un pedido que no se puede cumplir. Su mensaje es para quien corre el script. */
export class SetPlanError extends Error {
  readonly code: SetPlanErrorCode;

  constructor(code: SetPlanErrorCode, message: string) {
    super(message);
    this.name = 'SetPlanError';
    this.code = code;
  }
}

export interface SetPlanInput {
  readonly email: string;
  /** Sin tipar a propósito: llega de una terminal, y se valida acá. */
  readonly plan: string;
  readonly apply: boolean;
  readonly source: PlanSource;
}

export type SetPlanOutcome =
  | { readonly status: 'unchanged'; readonly email: string; readonly plan: Plan }
  | {
      readonly status: 'would-change' | 'changed';
      readonly email: string;
      readonly from: Plan;
      readonly to: Plan;
    };

export interface SetPlanDeps {
  readonly store: PlanStore;
  readonly now: () => Date;
}

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export async function setPlan(
  { store, now }: SetPlanDeps,
  input: SetPlanInput,
): Promise<SetPlanOutcome> {
  const plan = planSchema.safeParse(input.plan);
  if (!plan.success) {
    throw new SetPlanError(
      'INVALID_PLAN',
      `El plan "${input.plan}" no existe: los planes son ${planSchema.options.join(' y ')}.`,
    );
  }

  const email = emailSchema.safeParse(input.email);
  if (!email.success) {
    throw new SetPlanError('INVALID_EMAIL', `"${input.email}" no es un email.`);
  }

  const holder = await store.findByEmail(email.data);
  if (!holder) {
    throw new SetPlanError(
      'USER_NOT_FOUND',
      `No hay ningún usuario con el email ${email.data}. La cuenta nace del ingreso con un proveedor: ` +
        'la persona tiene que entrar una vez a la app con ese email, y después se vuelve a correr.',
    );
  }

  if (holder.plan === plan.data) {
    return { status: 'unchanged', email: holder.email, plan: holder.plan };
  }

  if (!input.apply) {
    return { status: 'would-change', email: holder.email, from: holder.plan, to: plan.data };
  }

  await store.writePlan(holder.id, { plan: plan.data, source: input.source, at: now() });

  return { status: 'changed', email: holder.email, from: holder.plan, to: plan.data };
}
