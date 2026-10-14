import type { Plan } from '@wasabi-cross/schemas';

/**
 * De dónde viene el plan de un usuario (ADR-0014). Hoy sólo se otorga a mano: no hay pasarela.
 * Cuando llegue, un cobro sumará su propio origen, y la regla de qué pisa a qué se decide ahí.
 */
export type PlanSource = 'manual';

/** Lo mínimo de un usuario que hace falta para cambiarle el plan. */
export interface PlanHolder {
  readonly id: string;
  readonly email: string;
  readonly plan: Plan;
}

export interface PlanChange {
  readonly plan: Plan;
  readonly source: PlanSource;
  readonly at: Date;
}

/**
 * Dónde vive el plan de un usuario. El documento de usuario es de Better Auth (`auth`): este puerto
 * es lo único que `subscriptions` pide de él, y quien lo cumple sólo toca los campos del plan.
 */
export interface PlanStore {
  /** Por email ya normalizado (minúsculas, sin espacios). `null` si no hay ningún usuario. */
  findByEmail(email: string): Promise<PlanHolder | null>;
  /** Falla si el usuario ya no existe: no se da por hecho un cambio que no ocurrió. */
  writePlan(userId: string, change: PlanChange): Promise<void>;
}
