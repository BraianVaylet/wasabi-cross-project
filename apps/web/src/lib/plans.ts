import type { Plan } from '@wasabi-cross/schemas';

/*
 * Cómo se presentan los dos planes (spec §4, §5.5). Es el texto del producto, no la regla: qué
 * plan ve las estadísticas lo dice `canViewStats` en `@wasabi-cross/schemas`, y lo hace cumplir la
 * API. Acá sólo se cuenta.
 *
 * El precio de Pro está "a definir" (ADR-0011): la pasarela de pago es una segunda etapa y la app
 * no inventa un monto. Cuando haya precio, es este archivo el que cambia.
 */

export interface PlanFeature {
  label: string;
  included: boolean;
}

export interface PlanInfo {
  name: string;
  /** Lo que cuesta el plan, tal como se muestra. */
  price: string;
  /** Una línea para el Perfil: qué se puede hacer con el plan. */
  summary: string;
  features: readonly PlanFeature[];
}

const SHARED_FEATURES: readonly PlanFeature[] = [
  { label: 'Todos los ejercicios y marcas que quieras', included: true },
  { label: 'Porcentajes de carga e historial de cada ejercicio', included: true },
];

export const PLAN_INFO: Record<Plan, PlanInfo> = {
  free: {
    name: 'Free',
    price: '$0',
    summary: 'Cargás todo lo que quieras. Las estadísticas son parte del plan Pro.',
    features: [...SHARED_FEATURES, { label: 'Estadísticas', included: false }],
  },
  pro: {
    name: 'Pro',
    price: 'A definir',
    summary: 'Cargás todo lo que quieras y ves las estadísticas de cada ejercicio.',
    features: [
      ...SHARED_FEATURES,
      { label: 'Estadísticas de cada ejercicio y generales', included: true },
    ],
  },
};

/** Free primero: de menos a más. */
export const PLAN_ORDER: readonly Plan[] = ['free', 'pro'];

/** El aviso de "Pasar a …" mientras el cambio de plan no existe (spec §5.5). */
export const PLAN_CHANGE_UNAVAILABLE =
  'Cambiar de plan todavía no está disponible: se habilita junto con el pago.';
